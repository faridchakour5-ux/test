import { NotifModule, createReminders, normalizeReminder } from './reminders';

const texts = { title: 'Kalam', body: 'Un petit moment ?' };
const on = { enabled: true, hour: 19, minute: 0 };

function fake(over: Partial<NotifModule> = {}) {
  const channels: { id: string; importance: number }[] = [];
  const scheduled: Parameters<NotifModule['scheduleNotificationAsync']>[0][] = [];
  const mod: NotifModule = {
    getPermissionsAsync: async () => ({ granted: true }),
    requestPermissionsAsync: async () => ({ granted: true }),
    setNotificationChannelAsync: async (id, c) => { channels.push({ id, importance: c.importance }); return null; },
    cancelScheduledNotificationAsync: async () => {},
    scheduleNotificationAsync: async (r) => { scheduled.push(r); return 'id'; },
    AndroidImportance: { DEFAULT: 5 },
    SchedulableTriggerInputTypes: { DAILY: 'daily' },
    ...over,
  };
  return { mod, channels, scheduled };
}

describe('normalizeReminder: bornes exactes', () => {
  it('0:00 et 23:59 sont valides, 24 h et 60 min non', () => {
    expect(normalizeReminder({ enabled: true, hour: 0, minute: 0 })).toEqual({ enabled: true, hour: 0, minute: 0 });
    expect(normalizeReminder({ enabled: true, hour: 23, minute: 59 })).toEqual({ enabled: true, hour: 23, minute: 59 });
    expect(normalizeReminder({ enabled: true, hour: 24, minute: 0 }).enabled).toBe(false);
    expect(normalizeReminder({ enabled: true, hour: 23, minute: 60 }).enabled).toBe(false);
  });
  it('heure invalide: l\'heure ET les minutes reviennent à 19:00 ensemble', () => {
    expect(normalizeReminder({ enabled: true, hour: 25, minute: 30 })).toEqual({ enabled: false, hour: 19, minute: 0 });
    expect(normalizeReminder({ enabled: true, hour: 8, minute: 99 })).toEqual({ enabled: false, hour: 19, minute: 0 });
    expect(normalizeReminder({ enabled: true, hour: '8', minute: 30 })).toEqual({ enabled: false, hour: 19, minute: 0 });
  });
});

describe('autorisation et pannes', () => {
  it('refus à la demande: « bloqué » seulement si le système ne redemandera plus', async () => {
    const asked = fake({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }), requestPermissionsAsync: async () => ({ granted: false, canAskAgain: true }) });
    expect(await createReminders(asked.mod).enable(on, texts)).toEqual({ ok: false, reason: 'permission' });
    const blocked = fake({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }), requestPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) });
    expect(await createReminders(blocked.mod).enable(on, texts)).toEqual({ ok: false, reason: 'permission-blocked' });
    expect(blocked.scheduled).toHaveLength(0);
  });
  it('lecture de l\'autorisation en panne: erreur claire, rien de programmé', async () => {
    const f = fake({ getPermissionsAsync: async () => { throw new Error('x'); } });
    expect(await createReminders(f.mod).enable(on, texts)).toEqual({ ok: false, reason: 'error' });
    expect(await createReminders(f.mod).sync(on, texts, true)).toEqual({ ok: false, reason: 'error' });
    expect(f.scheduled).toHaveLength(0);
  });
  it('programmation en panne: erreur claire', async () => {
    const f = fake({ scheduleNotificationAsync: async () => { throw new Error('x'); } });
    expect(await createReminders(f.mod).enable(on, texts)).toEqual({ ok: false, reason: 'error' });
  });
  it('annulation en panne: erreur claire (sans planter)', async () => {
    const f = fake({ cancelScheduledNotificationAsync: async () => { throw new Error('x'); } });
    expect(await createReminders(f.mod).disable()).toEqual({ ok: false, reason: 'error' });
  });
});

describe('plateforme et valeurs de repli', () => {
  it('par défaut Android: canal créé et rappel lié au canal', async () => {
    const f = fake();
    await createReminders(f.mod).enable(on, texts);
    expect(f.channels).toEqual([{ id: 'daily-reminder', importance: 5 }]);
    expect(f.scheduled[0].trigger).toMatchObject({ type: 'daily', hour: 19, minute: 0, channelId: 'daily-reminder' });
  });
  it('iOS: pas de canal, pas de channelId', async () => {
    const f = fake();
    await createReminders(f.mod, 'ios').enable(on, texts);
    expect(f.channels).toEqual([]);
    expect(f.scheduled[0].trigger).not.toHaveProperty('channelId');
  });
  it('module sans constantes: importance normale (5) et déclencheur « daily » par défaut', async () => {
    const f = fake({ AndroidImportance: undefined, SchedulableTriggerInputTypes: undefined });
    await createReminders(f.mod).enable(on, texts);
    expect(f.channels[0].importance).toBe(5);
    expect(f.scheduled[0].trigger).toMatchObject({ type: 'daily' });
  });
  it('le canal porte un nom lisible', async () => {
    let name = '';
    const f = fake({ setNotificationChannelAsync: async (_id, c) => { name = (c as { name: string }).name; return null; } });
    await createReminders(f.mod).enable(on, texts);
    expect(name).not.toBe('');
  });
});

describe('instance réelle (chargée à la demande)', () => {
  afterEach(() => { jest.dontMock('expo-notifications'); jest.resetModules(); });
  const load = (factory: () => unknown) => {
    let api!: typeof import('./reminders');
    jest.isolateModules(() => {
      jest.doMock('expo-notifications', factory as never);
      api = jest.requireActual('./reminders');
    });
    return api;
  };
  it('module natif absent ou qui plante au chargement: indisponible, sans planter', async () => {
    const api = load(() => { throw new Error('absent'); });
    expect(api.remindersAvailable()).toBe(false);
    expect(await api.disableReminder()).toEqual({ ok: true });
  });
  it('module natif présent: disponible, et un rappel est programmé', async () => {
    const f = fake();
    const api = load(() => f.mod);
    expect(api.remindersAvailable()).toBe(true);
    expect(await api.enableReminder(on, texts)).toEqual({ ok: true });
    expect(f.scheduled).toHaveLength(1);
  });
});
