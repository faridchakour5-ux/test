import { RecModule, createRecognizer, isSpeechInputAvailable, listenOnce } from './recognizer';

type Handler = (e: unknown) => void;

// Faux module natif: on déclenche les événements à la main.
function fakeModule(over: Partial<RecModule> = {}) {
  const handlers: Record<string, Handler[]> = {};
  const started: Record<string, unknown>[] = [];
  const mod: RecModule = {
    isRecognitionAvailable: () => true,
    supportsOnDeviceRecognition: () => true,
    getPermissionsAsync: async () => ({ granted: true }),
    requestPermissionsAsync: async () => ({ granted: true }),
    start: (o) => { started.push(o); },
    stop: jest.fn(),
    abort: jest.fn(),
    addListener: (name, cb) => {
      (handlers[name] ??= []).push(cb);
      return { remove: () => { handlers[name] = (handlers[name] ?? []).filter((h) => h !== cb); } };
    },
    ...over,
  };
  const emit = (name: string, e: unknown = {}) => [...(handlers[name] ?? [])].forEach((h) => h(e));
  return { mod, emit, started };
}
const flush = () => Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());

describe('createRecognizer', () => {
  it('indisponible sans module', async () => {
    const r = createRecognizer(null);
    expect(r.isAvailable()).toBe(false);
    await expect(r.listenOnce()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('renvoie le dernier texte quand l\'écoute se termine', async () => {
    const { mod, emit } = fakeModule();
    const partials: string[] = [];
    const p = createRecognizer(mod).listenOnce({ onPartial: (t) => partials.push(t) });
    await flush();
    emit('result', { results: [{ transcript: 'hello' }] });
    emit('result', { results: [{ transcript: 'hello world' }] });
    emit('end');
    await expect(p).resolves.toEqual({ ok: true, transcript: 'hello world' });
    expect(partials).toEqual(['hello', 'hello world']);
  });

  it('laisse la patience demandée à Android', async () => {
    const { mod, emit, started } = fakeModule();
    const p = createRecognizer(mod).listenOnce({ patienceMs: 3500 });
    await flush();
    expect((started[0].androidIntentOptions as Record<string, number>).EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS).toBe(3500);
    emit('end');
    await p;
  });

  it('rien entendu -> no-speech', async () => {
    const { mod, emit } = fakeModule();
    const p = createRecognizer(mod).listenOnce();
    await flush();
    emit('error', { error: 'no-speech' });
    await expect(p).resolves.toEqual({ ok: false, reason: 'no-speech' });
  });

  it('garde le texte déjà reconnu même si une erreur arrive ensuite', async () => {
    const { mod, emit } = fakeModule();
    const p = createRecognizer(mod).listenOnce();
    await flush();
    emit('result', { results: [{ transcript: 'good morning' }] });
    emit('error', { error: 'speech-timeout' });
    await expect(p).resolves.toEqual({ ok: true, transcript: 'good morning' });
  });

  it('distingue refus, refus définitif et langue non supportée', async () => {
    const denied = fakeModule({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }), requestPermissionsAsync: async () => ({ granted: false, canAskAgain: true }) });
    await expect(createRecognizer(denied.mod).listenOnce()).resolves.toEqual({ ok: false, reason: 'permission' });
    const blocked = fakeModule({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) });
    await expect(createRecognizer(blocked.mod).listenOnce()).resolves.toEqual({ ok: false, reason: 'permission-blocked' });
    const lang = fakeModule();
    const p = createRecognizer(lang.mod).listenOnce();
    await flush();
    lang.emit('error', { error: 'language-not-supported' });
    await expect(p).resolves.toEqual({ ok: false, reason: 'language' });
  });

  it('retente hors ligne si le réseau échoue', async () => {
    const { mod, emit, started } = fakeModule();
    const p = createRecognizer(mod).listenOnce();
    await flush();
    emit('error', { error: 'network' });
    await flush();
    expect(started).toHaveLength(2);
    expect(started[0].requiresOnDeviceRecognition).toBe(false);
    expect(started[1].requiresOnDeviceRecognition).toBe(true);
    emit('result', { results: [{ transcript: 'offline works' }] });
    emit('end');
    await expect(p).resolves.toEqual({ ok: true, transcript: 'offline works' });
  });

  it('échoue proprement si réseau KO et pas de reconnaissance hors ligne', async () => {
    const { mod, emit, started } = fakeModule({ supportsOnDeviceRecognition: () => false });
    const p = createRecognizer(mod).listenOnce();
    await flush();
    emit('error', { error: 'network' });
    await expect(p).resolves.toEqual({ ok: false, reason: 'network' });
    expect(started).toHaveLength(1);
  });

  it('cancel() annule et libère le moteur', async () => {
    const { mod } = fakeModule();
    const r = createRecognizer(mod);
    const p = r.listenOnce();
    await flush();
    r.cancel();
    await expect(p).resolves.toEqual({ ok: false, reason: 'cancelled' });
    expect(mod.abort).toHaveBeenCalled();
  });

  it('une nouvelle écoute annule la précédente (jamais deux en même temps)', async () => {
    const { mod, emit } = fakeModule();
    const r = createRecognizer(mod);
    const first = r.listenOnce();
    await flush();
    const second = r.listenOnce();
    await expect(first).resolves.toEqual({ ok: false, reason: 'cancelled' });
    await flush();
    emit('result', { results: [{ transcript: 'second' }] });
    emit('end');
    await expect(second).resolves.toEqual({ ok: true, transcript: 'second' });
  });

  it('deux demandes pendant la question de permission: une seule écoute démarre', async () => {
    const releases: ((v: { granted: boolean }) => void)[] = [];
    const { mod, started, emit } = fakeModule({ getPermissionsAsync: () => new Promise((res) => { releases.push(res); }) });
    const r = createRecognizer(mod);
    const first = r.listenOnce();
    const second = r.listenOnce();
    releases.forEach((rel) => rel({ granted: true }));
    await expect(first).resolves.toEqual({ ok: false, reason: 'cancelled' });
    await flush();
    expect(started).toHaveLength(1);
    emit('result', { results: [{ transcript: 'ok' }] });
    emit('end');
    await expect(second).resolves.toEqual({ ok: true, transcript: 'ok' });
  });

  it('cancel() pendant la question de permission: aucune écoute ne démarre', async () => {
    let release: (v: { granted: boolean }) => void = () => {};
    const { mod, started } = fakeModule({ getPermissionsAsync: () => new Promise((res) => { release = res; }) });
    const r = createRecognizer(mod);
    const p = r.listenOnce();
    r.cancel();
    release({ granted: true });
    await expect(p).resolves.toEqual({ ok: false, reason: 'cancelled' });
    await flush();
    expect(started).toHaveLength(0);
  });

  it('arrête proprement après la durée maximale et récupère le texte', async () => {
    jest.useFakeTimers();
    const { mod, emit } = fakeModule();
    const p = createRecognizer(mod).listenOnce({ maxMs: 5000 });
    await jest.advanceTimersByTimeAsync(10);
    emit('result', { results: [{ transcript: 'still talking' }] });
    await jest.advanceTimersByTimeAsync(5000);
    expect(mod.stop).toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(2100);
    await expect(p).resolves.toEqual({ ok: true, transcript: 'still talking' });
    jest.useRealTimers();
  });
});

describe('instance réelle sans module natif (Expo Go, tests)', () => {
  it('est indisponible sans planter', async () => {
    expect(isSpeechInputAvailable()).toBe(false);
    await expect(listenOnce()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });
});
