import { SpeechEngine, createTts } from './tts';

type Opts = { language?: string; voice?: string; rate?: number; onDone?: () => void; onStopped?: () => void; onError?: (e: unknown) => void };
type Voice = { identifier: string; language: string; quality?: string };

// Faux moteur vocal: `mode` décide ce qu'il fait quand on lui demande de parler.
function fakeEngine(over: Partial<SpeechEngine> = {}, mode: 'done' | 'error' | 'stopped' | 'silent' | 'throw' = 'done') {
  const spoken: { text: string; opts: Opts }[] = [];
  let stops = 0;
  const engine: SpeechEngine = {
    speak: (text, opts) => {
      spoken.push({ text, opts: opts as Opts });
      if (mode === 'throw') throw new Error('boom');
      if (mode === 'done') Promise.resolve().then(() => opts?.onDone?.());
      if (mode === 'error') Promise.resolve().then(() => opts?.onError?.(new Error('x')));
      if (mode === 'stopped') Promise.resolve().then(() => opts?.onStopped?.());
    },
    stop: async () => { stops++; },
    getAvailableVoicesAsync: async () => [],
    maxSpeechInputLength: 4000,
    ...over,
  };
  return { engine, spoken, stops: () => stops };
}
const voices = (list: Voice[]) => async () => list;

describe('choix de la voix', () => {
  const pick = async (lang: string, list: Voice[]) => {
    const f = fakeEngine({ getAvailableVoicesAsync: voices(list) });
    await createTts(f.engine).speak('Hi', { lang });
    return f.spoken[0].opts.voice;
  };
  it('prend la voix exacte (tiret ou souligné), pas seulement la même langue', async () => {
    expect(await pick('en-GB', [{ identifier: 'us', language: 'en-US' }, { identifier: 'gb', language: 'en_GB' }])).toBe('gb');
  });
  it('à défaut de voix exacte, une voix de la même langue', async () => {
    expect(await pick('en-AU', [{ identifier: 'fr', language: 'fr-FR' }, { identifier: 'us', language: 'en-US' }])).toBe('us');
  });
  it('préfère une voix « Enhanced » parmi les voix exactes', async () => {
    expect(await pick('en-US', [{ identifier: 'basic', language: 'en-US' }, { identifier: 'rich', language: 'en-US', quality: 'Enhanced' }])).toBe('rich');
    expect(await pick('en-US', [{ identifier: 'first', language: 'en-US', quality: 'Default' }, { identifier: 'second', language: 'en-US' }])).toBe('first');
  });
  it('insensible à la casse', async () => {
    expect(await pick('EN-us', [{ identifier: 'v', language: 'en_us' }])).toBe('v');
  });
  it('aucune voix pour la langue, voix sans langue, ou liste en panne: pas de voix imposée', async () => {
    expect(await pick('de-DE', [{ identifier: 'us', language: 'en-US' }])).toBeUndefined();
    expect(await pick('en-US', [{ identifier: 'x' } as unknown as Voice])).toBeUndefined();
    const f = fakeEngine({ getAvailableVoicesAsync: async () => { throw new Error('x'); } });
    expect(await createTts(f.engine).speak('Hi')).toBe('done');
    expect(f.spoken[0].opts.voice).toBeUndefined();
  });
});

describe('hasVoice', () => {
  it('vrai si une voix existe pour la langue (tiret ou souligné), faux sinon', async () => {
    const t = createTts(fakeEngine({ getAvailableVoicesAsync: voices([{ identifier: 'a', language: 'fr_FR' }]) }).engine);
    expect(await t.hasVoice('fr-FR')).toBe(true);
    expect(await t.hasVoice('FR-ca')).toBe(true);
    expect(await t.hasVoice('en-US')).toBe(false);
  });
  it('en cas de doute (liste illisible): vrai, on tente quand même', async () => {
    const t = createTts(fakeEngine({ getAvailableVoicesAsync: async () => { throw new Error('x'); } }).engine);
    expect(await t.hasVoice('en-US')).toBe(true);
  });
});

describe('speak', () => {
  it('résultats: fini, arrêté, erreur du moteur, moteur qui plante', async () => {
    expect(await createTts(fakeEngine({}, 'done').engine).speak('Hello')).toBe('done');
    expect(await createTts(fakeEngine({}, 'stopped').engine).speak('Hello')).toBe('stopped');
    expect(await createTts(fakeEngine({}, 'error').engine).speak('Hello')).toBe('error');
    expect(await createTts(fakeEngine({}, 'throw').engine).speak('Hello')).toBe('error');
  });
  it('options par défaut (en-US, vitesse 1) et options données', async () => {
    const a = fakeEngine();
    await createTts(a.engine).speak('Hello');
    expect(a.spoken[0].opts).toMatchObject({ language: 'en-US', rate: 1 });
    const b = fakeEngine();
    await createTts(b.engine).speak('Bonjour', { lang: 'fr-FR', rate: 0.8 });
    expect(b.spoken[0].opts).toMatchObject({ language: 'fr-FR', rate: 0.8 });
  });
  it('texte vide ou seulement des émojis: rien n\'est lu, résultat « fini »', async () => {
    const f = fakeEngine();
    expect(await createTts(f.engine).speak('😀 **')).toBe('done');
    expect(f.spoken).toHaveLength(0);
  });
  it('arrête la lecture précédente du moteur avant de parler, même si stop() plante', async () => {
    const f = fakeEngine({ stop: async () => { throw new Error('x'); } });
    expect(await createTts(f.engine).speak('Hello')).toBe('done');
  });
  it('découpe selon la limite du moteur, et 3000 si le moteur ne la donne pas ou dépasse', async () => {
    const small = fakeEngine({ maxSpeechInputLength: 20 });
    await createTts(small.engine).speak('One two three. Four five six. Seven eight nine.');
    expect(small.spoken.map((s) => s.text)).toEqual(['One two three.', 'Four five six.', 'Seven eight nine.']);
    const none = fakeEngine({ maxSpeechInputLength: 0 });
    await createTts(none.engine).speak('word '.repeat(700)); // 3 499 caractères
    expect(none.spoken.length).toBe(2);
    expect(none.spoken.every((s) => s.text.length <= 3000)).toBe(true);
    const big = fakeEngine({ maxSpeechInputLength: 10_000 });
    await createTts(big.engine).speak('word '.repeat(700));
    expect(big.spoken.length).toBe(2);
  });
  it('une erreur arrête la suite; l\'arrêt volontaire aussi', async () => {
    const f = fakeEngine({ maxSpeechInputLength: 20 }, 'error');
    expect(await createTts(f.engine).speak('One two three. Four five six.')).toBe('error');
    expect(f.spoken).toHaveLength(1);
  });
  it('nouvelle lecture: l\'ancienne se termine « arrêtée » et la nouvelle va au bout', async () => {
    const f = fakeEngine({}, 'silent');
    const t = createTts(f.engine);
    const first = t.speak('First sentence here');
    await new Promise((r) => setTimeout(r, 5));
    const second = t.speak('Second');
    await new Promise((r) => setTimeout(r, 5));
    expect(await first).toBe('stopped');
    f.spoken[f.spoken.length - 1].opts.onDone?.();
    expect(await second).toBe('done');
  });
  it('stop(): la lecture en cours devient « arrêtée », le moteur est stoppé, plus aucune minuterie', async () => {
    jest.useFakeTimers();
    try {
      const f = fakeEngine({}, 'silent');
      const t = createTts(f.engine);
      const p = t.speak('Hello there');
      await jest.advanceTimersByTimeAsync(10);
      const before = f.stops();
      await t.stop();
      expect(await p).toBe('stopped');
      expect(f.stops()).toBe(before + 1);
      expect(jest.getTimerCount()).toBe(0);
    } finally { jest.useRealTimers(); }
  });
  it('stop() avec un moteur qui plante ne plante pas; stop() sans lecture non plus', async () => {
    const t = createTts(fakeEngine({ stop: async () => { throw new Error('x'); } }).engine);
    await expect(t.stop()).resolves.toBeUndefined();
    await expect(createTts(fakeEngine().engine).stop()).resolves.toBeUndefined();
  });
  it('moteur qui ne signale jamais la fin: garde-fou après la durée estimée', async () => {
    jest.useFakeTimers();
    try {
      const f = fakeEngine({}, 'silent');
      const p = createTts(f.engine).speak('one two');
      await jest.advanceTimersByTimeAsync(5199);
      let settled = false; void p.then(() => { settled = true; });
      await jest.advanceTimersByTimeAsync(0);
      expect(settled).toBe(false);
      await jest.advanceTimersByTimeAsync(2);
      expect(await p).toBe('done');
      expect(jest.getTimerCount()).toBe(0);
    } finally { jest.useRealTimers(); }
  });
  it('un signal tardif du moteur après la fin est sans effet', async () => {
    const f = fakeEngine();
    const t = createTts(f.engine);
    expect(await t.speak('Hello')).toBe('done');
    f.spoken[0].opts.onError?.(new Error('late'));
    f.spoken[0].opts.onStopped?.();
    expect(await t.speak('Again')).toBe('done');
  });
});

describe('speakStream', () => {
  it('lit les phrases dans l\'ordre et se termine quand tout est lu', async () => {
    const f = fakeEngine();
    const s = createTts(f.engine).speakStream({ lang: 'fr-FR', rate: 0.9 });
    s.push('Bonjour tout le monde.');
    s.push('Comment allez-vous ?');
    expect(await s.end()).toBe('done');
    expect(f.spoken.map((x) => x.text)).toEqual(['Bonjour tout le monde.', 'Comment allez-vous ?']);
    expect(f.spoken[0].opts).toMatchObject({ language: 'fr-FR', rate: 0.9 });
  });
  it('options par défaut (en-US, vitesse 1)', async () => {
    const f = fakeEngine();
    const s = createTts(f.engine).speakStream();
    s.push('Hello there.');
    await s.end();
    expect(f.spoken[0].opts).toMatchObject({ language: 'en-US', rate: 1 });
  });
  it('rien poussé → « fini » tout de suite; texte vide ou émojis ignorés', async () => {
    const f = fakeEngine();
    const s = createTts(f.engine).speakStream();
    s.push('');
    s.push('😀');
    expect(await s.end()).toBe('done');
    expect(f.spoken).toHaveLength(0);
  });
  it('une phrase en erreur: on continue, le résultat final est « erreur »', async () => {
    let n = 0;
    const f = fakeEngine({ speak: (text, opts) => {
      n++;
      const o = opts as Opts;
      Promise.resolve().then(() => (n === 1 ? o.onError?.(new Error('x')) : o.onDone?.()));
      f.spoken.push({ text, opts: o });
    } });
    const s = createTts(f.engine).speakStream();
    s.push('First one.');
    s.push('Second one.');
    expect(await s.end()).toBe('error');
    expect(f.spoken.map((x) => x.text)).toEqual(['First one.', 'Second one.']);
  });
  it('stop() en cours de lecture: résultat « arrêté », phrases restantes abandonnées', async () => {
    const f = fakeEngine({}, 'silent');
    const t = createTts(f.engine);
    const s = t.speakStream();
    s.push('First one.');
    s.push('Second one.');
    await new Promise((r) => setTimeout(r, 5));
    await t.stop();
    expect(await s.end()).toBe('stopped');
    expect(f.spoken.map((x) => x.text)).toEqual(['First one.']);
    s.push('Too late.'); // ignoré
    expect(f.spoken).toHaveLength(1);
  });
  it('une autre lecture remplace le flux en cours', async () => {
    const f = fakeEngine({}, 'silent');
    const t = createTts(f.engine);
    const s = t.speakStream();
    s.push('First one.');
    await new Promise((r) => setTimeout(r, 5));
    void t.speak('Other');
    expect(await s.end()).toBe('stopped');
  });
  it('end() après stop sans rien de lu: « arrêté »; push après end ignoré', async () => {
    const f = fakeEngine();
    const t = createTts(f.engine);
    const s = t.speakStream();
    await t.stop();
    expect(await s.end()).toBe('stopped');
    const s2 = t.speakStream();
    s2.push('One here.');
    const done = s2.end();
    s2.push('Ignored after end.');
    expect(await done).toBe('done');
    expect(f.spoken.map((x) => x.text)).toEqual(['One here.']);
  });
  it('end() puis phrases encore en cours: attend vraiment la fin de la dernière', async () => {
    const f = fakeEngine({}, 'silent');
    const s = createTts(f.engine).speakStream();
    s.push('Only one.');
    let finished = false;
    const done = s.end().then((r) => { finished = true; return r; });
    await new Promise((r) => setTimeout(r, 10));
    expect(finished).toBe(false);
    f.spoken[0].opts.onDone?.();
    expect(await done).toBe('done');
  });
  it('découpe les longues phrases selon la limite du moteur', async () => {
    const f = fakeEngine({ maxSpeechInputLength: 12 });
    const s = createTts(f.engine).speakStream();
    s.push('abcdefghijklmnopqrstuvwx');
    await s.end();
    expect(f.spoken.map((x) => x.text)).toEqual(['abcdefghijkl', 'mnopqrstuvwx']);
  });
});
