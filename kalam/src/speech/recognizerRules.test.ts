import { RecModule, createRecognizer } from './recognizer';

type Handler = (e: unknown) => void;

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
  const listeners = () => Object.values(handlers).reduce((n, l) => n + l.length, 0);
  return { mod, emit, started, listeners };
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

// Chaque code d'erreur du moteur → la bonne raison, avec ou sans texte déjà reconnu.
describe('codes d\'erreur du moteur de reconnaissance', () => {
  const cases: [string | undefined, string][] = [
    ['not-allowed', 'permission'], ['service-not-allowed', 'permission'], ['language-not-supported', 'language'],
    ['busy', 'busy'], ['no-speech', 'no-speech'], ['speech-timeout', 'no-speech'], ['aborted', 'cancelled'],
    ['audio-capture', 'error'], ['inconnu', 'error'], [undefined, 'error'],
  ];
  for (const [code, reason] of cases) {
    it(`${String(code)} → ${reason}`, async () => {
      const f = fakeModule();
      const p = createRecognizer(f.mod).listenOnce();
      await flush();
      f.emit('error', code === undefined ? {} : { error: code });
      await expect(p).resolves.toEqual({ ok: false, reason });
    });
  }
  it('erreur sans objet du tout → error', async () => {
    const f = fakeModule();
    const p = createRecognizer(f.mod).listenOnce();
    await flush();
    f.emit('error', undefined);
    await expect(p).resolves.toEqual({ ok: false, reason: 'error' });
  });
  it('occupé, réseau et erreur inconnue gardent le texte déjà compris', async () => {
    for (const code of ['busy', 'audio-capture']) {
      const f = fakeModule();
      const p = createRecognizer(f.mod).listenOnce();
      await flush();
      f.emit('result', { results: [{ transcript: '  bonjour  ' }] });
      f.emit('error', { error: code });
      await expect(p).resolves.toEqual({ ok: true, transcript: 'bonjour' });
    }
  });
  it('réseau avec texte déjà compris: pas de seconde tentative, le texte est rendu', async () => {
    const f = fakeModule();
    const p = createRecognizer(f.mod).listenOnce();
    await flush();
    f.emit('result', { results: [{ transcript: 'hello' }] });
    f.emit('error', { error: 'network' });
    await expect(p).resolves.toEqual({ ok: true, transcript: 'hello' });
    expect(f.started).toHaveLength(1);
  });
  it('les refus et langues ne gardent PAS de texte (la personne doit agir)', async () => {
    for (const [code, reason] of [['not-allowed', 'permission'], ['language-not-supported', 'language']]) {
      const f = fakeModule();
      const p = createRecognizer(f.mod).listenOnce();
      await flush();
      f.emit('result', { results: [{ transcript: 'x' }] });
      f.emit('error', { error: code });
      await expect(p).resolves.toEqual({ ok: false, reason });
    }
  });
});

describe('résultats partiels et fin', () => {
  it('ignore les résultats vides, absents ou mal formés', async () => {
    const f = fakeModule();
    const partials: string[] = [];
    const p = createRecognizer(f.mod).listenOnce({ onPartial: (t) => partials.push(t) });
    await flush();
    for (const e of [undefined, {}, { results: [] }, { results: [{}] }, { results: [{ transcript: '' }] }, { results: [{ transcript: 5 }] }, { results: [null] }])
      f.emit('result', e);
    f.emit('result', { results: [{ transcript: 'ok' }] });
    f.emit('end');
    await expect(p).resolves.toEqual({ ok: true, transcript: 'ok' });
    expect(partials).toEqual(['ok']);
  });
  it('un texte fait seulement d\'espaces ne compte pas', async () => {
    const f = fakeModule();
    const p = createRecognizer(f.mod).listenOnce();
    await flush();
    f.emit('result', { results: [{ transcript: '   ' }] });
    f.emit('end');
    await expect(p).resolves.toEqual({ ok: false, reason: 'no-speech' });
  });
  it('fin sans texte → no-speech; après la fin, les événements tardifs sont ignorés', async () => {
    const f = fakeModule();
    const p = createRecognizer(f.mod).listenOnce();
    await flush();
    f.emit('end');
    f.emit('result', { results: [{ transcript: 'trop tard' }] });
    f.emit('error', { error: 'network' });
    await expect(p).resolves.toEqual({ ok: false, reason: 'no-speech' });
    expect(f.started).toHaveLength(1);
  });
  it('nettoie ses abonnements et ses minuteries à la fin (aucune fuite)', async () => {
    jest.useFakeTimers();
    try {
      const f = fakeModule();
      const p = createRecognizer(f.mod).listenOnce();
      await jest.advanceTimersByTimeAsync(5);
      expect(f.listeners()).toBe(3);
      f.emit('end');
      await p;
      expect(f.listeners()).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    } finally { jest.useRealTimers(); }
  });
  it('annulation: abort appelé, abonnements retirés, une écoute suivante est possible', async () => {
    const f = fakeModule();
    const r = createRecognizer(f.mod);
    const p = r.listenOnce();
    await flush();
    r.cancel();
    await expect(p).resolves.toEqual({ ok: false, reason: 'cancelled' });
    expect(f.listeners()).toBe(0);
    r.cancel(); // sans écoute en cours: sans effet, sans planter
    const q = r.listenOnce();
    await flush();
    f.emit('result', { results: [{ transcript: 'again' }] });
    f.emit('end');
    await expect(q).resolves.toEqual({ ok: true, transcript: 'again' });
  });
  it('une erreur arrivant après cancel est « annulée », pas une vraie erreur', async () => {
    const f = fakeModule();
    const r = createRecognizer(f.mod);
    const p = r.listenOnce();
    await flush();
    r.cancel();
    f.emit('error', { error: 'network' });
    await expect(p).resolves.toEqual({ ok: false, reason: 'cancelled' });
  });
});

describe('options de démarrage', () => {
  it('valeurs par défaut: anglais, texte provisoire, une seule phrase, sans ponctuation, patience 2,2 s', async () => {
    const f = fakeModule();
    const p = createRecognizer(f.mod).listenOnce();
    await flush();
    expect(f.started[0]).toEqual({
      lang: 'en-US', interimResults: true, continuous: false, maxAlternatives: 1, requiresOnDeviceRecognition: false, addsPunctuation: false,
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2200,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2200,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1500,
      },
    });
    f.emit('end');
    await p;
  });
  it('langue demandée transmise', async () => {
    const f = fakeModule();
    const p = createRecognizer(f.mod).listenOnce({ lang: 'fr-FR' });
    await flush();
    expect(f.started[0].lang).toBe('fr-FR');
    f.emit('end');
    await p;
  });
  it('démarrage qui plante → error, abonnements retirés', async () => {
    const f = fakeModule({ start: () => { throw new Error('boom'); } });
    await expect(createRecognizer(f.mod).listenOnce()).resolves.toEqual({ ok: false, reason: 'error' });
    expect(f.listeners()).toBe(0);
  });
});

describe('disponibilité et permissions', () => {
  it('isAvailable: vrai seulement si le moteur le dit; une exception vaut « non »', () => {
    expect(createRecognizer(fakeModule().mod).isAvailable()).toBe(true);
    expect(createRecognizer(fakeModule({ isRecognitionAvailable: () => false }).mod).isAvailable()).toBe(false);
    expect(createRecognizer(fakeModule({ isRecognitionAvailable: () => { throw new Error('x'); } }).mod).isAvailable()).toBe(false);
  });
  it('moteur présent mais service indisponible → unavailable, sans demander de permission', async () => {
    const req = jest.fn(async () => ({ granted: true }));
    const f = fakeModule({ isRecognitionAvailable: () => false, requestPermissionsAsync: req });
    await expect(createRecognizer(f.mod).listenOnce()).resolves.toEqual({ ok: false, reason: 'unavailable' });
    expect(req).not.toHaveBeenCalled();
  });
  it('permission déjà donnée: on ne redemande pas', async () => {
    const req = jest.fn(async () => ({ granted: true }));
    const f = fakeModule({ requestPermissionsAsync: req });
    const p = createRecognizer(f.mod).listenOnce();
    await flush();
    expect(req).not.toHaveBeenCalled();
    f.emit('end');
    await p;
  });
  it('permission à demander: acceptée → l\'écoute démarre', async () => {
    const f = fakeModule({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }), requestPermissionsAsync: async () => ({ granted: true }) });
    const p = createRecognizer(f.mod).listenOnce();
    await flush();
    expect(f.started).toHaveLength(1);
    f.emit('end');
    await p;
  });
  it('refusée avec « ne plus demander » à la demande → permission-blocked', async () => {
    const f = fakeModule({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }), requestPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) });
    await expect(createRecognizer(f.mod).listenOnce()).resolves.toEqual({ ok: false, reason: 'permission-blocked' });
    expect(f.started).toHaveLength(0);
  });
  it('question de permission en panne → error, aucune écoute', async () => {
    for (const k of ['getPermissionsAsync', 'requestPermissionsAsync'] as const) {
      const f = fakeModule({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }), [k]: async () => { throw new Error('x'); } });
      await expect(createRecognizer(f.mod).listenOnce()).resolves.toEqual({ ok: false, reason: 'error' });
      expect(f.started).toHaveLength(0);
    }
  });
  it('cancel() puis nouvelle écoute: le compteur reste cohérent', async () => {
    const f = fakeModule();
    const r = createRecognizer(f.mod);
    r.cancel();
    const p = r.listenOnce();
    await flush();
    expect(f.started).toHaveLength(1);
    f.emit('end');
    await p;
  });
});

describe('durée maximale et repli hors ligne', () => {
  it('maxMs par défaut: 20 s avant la demande d\'arrêt, puis 2 s de grâce avant de forcer', async () => {
    jest.useFakeTimers();
    try {
      const f = fakeModule();
      const p = createRecognizer(f.mod).listenOnce();
      await jest.advanceTimersByTimeAsync(19_900);
      expect(f.mod.stop).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(200);
      expect(f.mod.stop).toHaveBeenCalledTimes(1);
      expect(f.mod.abort).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1800);
      expect(f.mod.abort).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(300);
      expect(f.mod.abort).toHaveBeenCalledTimes(1);
      await expect(p).resolves.toEqual({ ok: false, reason: 'no-speech' });
      expect(jest.getTimerCount()).toBe(0);
    } finally { jest.useRealTimers(); }
  });
  it('si la fin arrive pendant la grâce, la minuterie de grâce est annulée', async () => {
    jest.useFakeTimers();
    try {
      const f = fakeModule();
      const p = createRecognizer(f.mod).listenOnce({ maxMs: 1000 });
      await jest.advanceTimersByTimeAsync(1100);
      f.emit('result', { results: [{ transcript: 'fini' }] });
      f.emit('end');
      await expect(p).resolves.toEqual({ ok: true, transcript: 'fini' });
      expect(jest.getTimerCount()).toBe(0);
      expect(f.mod.abort).not.toHaveBeenCalled();
    } finally { jest.useRealTimers(); }
  });
  it('stop() ou abort() qui plantent ne cassent pas l\'écoute', async () => {
    jest.useFakeTimers();
    try {
      const f = fakeModule({ stop: () => { throw new Error('x'); }, abort: () => { throw new Error('y'); } });
      const p = createRecognizer(f.mod).listenOnce({ maxMs: 100 });
      await jest.advanceTimersByTimeAsync(2300);
      await expect(p).resolves.toEqual({ ok: false, reason: 'no-speech' });
    } finally { jest.useRealTimers(); }
  });
  it('abort qui plante pendant cancel: annulation quand même', async () => {
    const f = fakeModule({ abort: () => { throw new Error('y'); } });
    const r = createRecognizer(f.mod);
    const p = r.listenOnce();
    await flush();
    r.cancel();
    await expect(p).resolves.toEqual({ ok: false, reason: 'cancelled' });
  });
  it('repli hors ligne: mêmes options, et sans module « supportsOnDevice » pas de repli', async () => {
    const f = fakeModule({ supportsOnDeviceRecognition: undefined });
    const p = createRecognizer(f.mod).listenOnce({ lang: 'fr-FR' });
    await flush();
    f.emit('error', { error: 'network' });
    await expect(p).resolves.toEqual({ ok: false, reason: 'network' });
    expect(f.started).toHaveLength(1);
    const g = fakeModule();
    const q = createRecognizer(g.mod).listenOnce({ lang: 'fr-FR' });
    await flush();
    g.emit('error', { error: 'network' });
    await flush();
    expect(g.started[1]).toMatchObject({ lang: 'fr-FR', requiresOnDeviceRecognition: true });
    g.emit('end');
    await q;
  });
});
