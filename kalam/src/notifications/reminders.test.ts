import { CHANNEL_ID, NotifModule, REMINDER_ID, createReminders, defaultReminder, normalizeReminder, timeLabel } from './reminders';

const texts = { title: 'Kalam', body: 'Un petit moment pour parler ?' };
const on = { enabled: true, hour: 19, minute: 0 };

function fakeModule(over: Partial<NotifModule> = {}) {
  const calls: string[] = [];
  const scheduled: Parameters<NotifModule['scheduleNotificationAsync']>[0][] = [];
  const channels: { id: string; importance: number }[] = [];
  const mod: NotifModule = {
    getPermissionsAsync: async () => ({ granted: true }),
    requestPermissionsAsync: async () => ({ granted: true }),
    setNotificationChannelAsync: async (id, c) => { calls.push('channel'); channels.push({ id, importance: c.importance }); return null; },
    cancelScheduledNotificationAsync: async () => { calls.push('cancel'); },
    scheduleNotificationAsync: async (r) => { calls.push('schedule'); scheduled.push(r); return 'id'; },
    AndroidImportance: { DEFAULT: 5 },
    SchedulableTriggerInputTypes: { DAILY: 'daily' },
    ...over,
  };
  return { mod, calls, scheduled, channels };
}

describe('réglage du rappel', () => {
  it('désactivé par défaut (jamais de rappel sans choix de la personne)', () => {
    expect(defaultReminder().enabled).toBe(false);
  });
  it('relecture d\'une sauvegarde abîmée: retour à « désactivé, 19:00 »', () => {
    for (const bad of [null, undefined, 3, 'x', [], {}, { enabled: 'yes' }, { enabled: true, hour: 25, minute: 0 }, { enabled: true, hour: 8.5, minute: 0 }, { enabled: true, hour: 8, minute: -1 }]) {
      const r = normalizeReminder(bad);
      expect(r.enabled).toBe(false);
      expect(r.hour).toBe(19);
      expect(r.minute).toBe(0);
    }
    expect(normalizeReminder({ enabled: true, hour: 8, minute: 30 })).toEqual({ enabled: true, hour: 8, minute: 30 });
  });
  it('affiche l\'heure sur deux chiffres', () => {
    expect(timeLabel(8, 5)).toBe('08:05');
  });
});

describe('createReminders', () => {
  it('sans module natif: indisponible, sans planter', async () => {
    const r = createReminders(null);
    expect(r.isAvailable()).toBe(false);
    expect(await r.enable(on, texts)).toEqual({ ok: false, reason: 'unavailable' });
    expect(await r.disable()).toEqual({ ok: true });
    expect(await r.sync(on, texts, true)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('activer: canal Android (importance normale), puis un seul rappel quotidien à l\'heure choisie', async () => {
    const { mod, calls, scheduled, channels } = fakeModule();
    const r = await createReminders(mod, 'android').enable({ enabled: true, hour: 8, minute: 30 }, texts);
    expect(r).toEqual({ ok: true });
    expect(channels).toEqual([{ id: CHANNEL_ID, importance: 5 }]);
    expect(calls).toEqual(['channel', 'cancel', 'schedule']); // le canal d'abord; l'ancien rappel est remplacé
    expect(scheduled[0]).toMatchObject({ identifier: REMINDER_ID, content: texts, trigger: { type: 'daily', hour: 8, minute: 30, channelId: CHANNEL_ID } });
  });

  it('lit les constantes du module natif (importance, déclencheur) au lieu de les deviner', async () => {
    const { mod, channels, scheduled } = fakeModule({ AndroidImportance: { DEFAULT: 7 }, SchedulableTriggerInputTypes: { DAILY: 'quotidien' } });
    await createReminders(mod, 'android').enable(on, texts);
    expect(channels[0].importance).toBe(7);
    expect(scheduled[0].trigger.type).toBe('quotidien');
  });

  it('iOS: pas de canal', async () => {
    const { mod, calls, scheduled } = fakeModule();
    await createReminders(mod, 'ios').enable(on, texts);
    expect(calls).toEqual(['cancel', 'schedule']);
    expect(scheduled[0].trigger).not.toHaveProperty('channelId');
  });

  it('demande l\'autorisation si elle manque; refusée: rien n\'est programmé', async () => {
    const { mod, scheduled } = fakeModule({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }), requestPermissionsAsync: async () => ({ granted: false, canAskAgain: true }) });
    expect(await createReminders(mod).enable(on, texts)).toEqual({ ok: false, reason: 'permission' });
    expect(scheduled).toHaveLength(0);
  });

  it('refus définitif: propose d\'ouvrir les réglages, sans reposer la question', async () => {
    const request = jest.fn();
    const { mod } = fakeModule({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: false }), requestPermissionsAsync: request });
    expect(await createReminders(mod).enable(on, texts)).toEqual({ ok: false, reason: 'permission-blocked' });
    expect(request).not.toHaveBeenCalled();
  });

  it('une panne du module donne une erreur claire, jamais une exception', async () => {
    const { mod } = fakeModule({ scheduleNotificationAsync: async () => { throw new Error('boom'); } });
    expect(await createReminders(mod).enable(on, texts)).toEqual({ ok: false, reason: 'error' });
  });

  it('changer l\'heure remplace le rappel (jamais deux rappels)', async () => {
    const { mod, scheduled } = fakeModule();
    const r = createReminders(mod);
    await r.enable({ enabled: true, hour: 8, minute: 0 }, texts);
    await r.enable({ enabled: true, hour: 20, minute: 30 }, texts);
    expect(scheduled.map((s) => s.identifier)).toEqual([REMINDER_ID, REMINDER_ID]);
  });

  it('désactiver annule le rappel', async () => {
    const cancel = jest.fn(async () => {});
    const { mod } = fakeModule({ cancelScheduledNotificationAsync: cancel });
    expect(await createReminders(mod).disable()).toEqual({ ok: true });
    expect(cancel).toHaveBeenCalledWith(REMINDER_ID);
  });

  describe('sync au lancement', () => {
    it('rappel actif et autorisé: reprogrammé (fuseau, langue ou mise à jour du téléphone)', async () => {
      const { mod, scheduled } = fakeModule();
      expect(await createReminders(mod).sync(on, texts, true)).toEqual({ ok: true });
      expect(scheduled).toHaveLength(1);
    });
    it('ne demande JAMAIS l\'autorisation tout seul', async () => {
      const request = jest.fn();
      const { mod, scheduled } = fakeModule({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }), requestPermissionsAsync: request });
      expect(await createReminders(mod).sync(on, texts, true)).toEqual({ ok: false, reason: 'permission' });
      expect(request).not.toHaveBeenCalled();
      expect(scheduled).toHaveLength(0);
    });
    it('autorisation retirée entre-temps: le rappel est annulé', async () => {
      const cancel = jest.fn(async () => {});
      const { mod } = fakeModule({ getPermissionsAsync: async () => ({ granted: false }), cancelScheduledNotificationAsync: cancel });
      await createReminders(mod).sync(on, texts, true);
      expect(cancel).toHaveBeenCalledWith(REMINDER_ID);
    });
    it('rappel désactivé, ou profil non autorisé (enfant): annulé, rien n\'est programmé', async () => {
      const { mod, scheduled, calls } = fakeModule();
      const r = createReminders(mod);
      await r.sync({ ...on, enabled: false }, texts, true);
      await r.sync(on, texts, false);
      expect(scheduled).toHaveLength(0);
      expect(calls.filter((c) => c === 'cancel')).toHaveLength(2);
    });
  });
});

describe('Android 13+: le canal existe AVANT la demande d\'autorisation (sinon la boîte ne s\'affiche pas)', () => {
  it('première activation sans autorisation: canal créé, PUIS autorisation demandée, PUIS rappel programmé', async () => {
    const calls: string[] = [];
    const f = fakeModule({
      getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
      requestPermissionsAsync: async () => { calls.push('demande'); return { granted: true }; },
      setNotificationChannelAsync: async () => { calls.push('canal'); return null; },
      cancelScheduledNotificationAsync: async () => { calls.push('annule'); },
      scheduleNotificationAsync: async () => { calls.push('programme'); return 'id'; },
    });
    expect(await createReminders(f.mod, 'android').enable(on, texts)).toEqual({ ok: true });
    expect(calls.slice(0, 2)).toEqual(['canal', 'demande']); // l'ordre qui compte
    expect(calls.at(-1)).toBe('programme');
  });
  it('autorisation refusée: le canal a quand même été créé avant la demande (sans erreur, rappel non programmé)', async () => {
    const calls: string[] = [];
    const f = fakeModule({
      getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
      requestPermissionsAsync: async () => { calls.push('demande'); return { granted: false, canAskAgain: true }; },
      setNotificationChannelAsync: async () => { calls.push('canal'); return null; },
      scheduleNotificationAsync: async () => { calls.push('programme'); return 'id'; },
    });
    expect(await createReminders(f.mod, 'android').enable(on, texts)).toEqual({ ok: false, reason: 'permission' });
    expect(calls).toEqual(['canal', 'demande']);
  });
  it('autorisation déjà donnée: pas de demande (un seul canal créé, au moment de programmer)', async () => {
    const f = fakeModule();
    await createReminders(f.mod, 'android').enable(on, texts);
    expect(f.channels).toHaveLength(1);
  });
  it('iOS: aucun canal', async () => {
    const f = fakeModule({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }) });
    await createReminders(f.mod, 'ios').enable(on, texts);
    expect(f.channels).toHaveLength(0);
  });
  it('synchronisation au lancement sans autorisation: ne demande rien et ne crée pas de canal inutilement', async () => {
    const f = fakeModule({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }) });
    expect(await createReminders(f.mod, 'android').sync(on, texts, true)).toEqual({ ok: false, reason: 'permission' });
    expect(f.channels).toHaveLength(0);
  });
});
