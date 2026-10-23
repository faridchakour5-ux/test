import { cleanForSpeech, estimateSpeechMs, splitForSpeech } from './speechText';
import { SpeechEngine, createTts } from './tts';

describe('speechText', () => {
  it('retire markdown et émojis', () => {
    expect(cleanForSpeech('**Great!** 😀 You _did_ it')).toBe('Great! You did it');
  });
  it('découpe aux phrases sans dépasser la limite', () => {
    const text = 'One two three. Four five six. Seven eight nine.';
    const chunks = splitForSpeech(text, 20);
    expect(chunks.every((c) => c.length <= 20)).toBe(true);
    expect(chunks.join(' ')).toBe(text);
  });
  it('découpe un mot géant et renvoie [] pour du vide', () => {
    expect(splitForSpeech('a'.repeat(25), 10).map((c) => c.length)).toEqual([10, 10, 5]);
    expect(splitForSpeech('  😀 ', 10)).toEqual([]);
  });
  it('estime une durée croissante et plus longue à vitesse lente', () => {
    expect(estimateSpeechMs('a b c d', 1)).toBeLessThan(estimateSpeechMs('a b c d e f g h', 1));
    expect(estimateSpeechMs('a b c d', 0.5)).toBeGreaterThan(estimateSpeechMs('a b c d', 1));
  });
});

function fakeEngine(behaviour: 'done' | 'error' | 'silent' = 'done') {
  const spoken: { text: string; voice?: string }[] = [];
  const engine: SpeechEngine = {
    maxSpeechInputLength: 4000,
    speak: (text, o) => {
      spoken.push({ text, voice: o?.voice });
      if (behaviour === 'done') setTimeout(() => o?.onDone?.(), 10);
      if (behaviour === 'error') setTimeout(() => o?.onError?.(new Error('x')), 10);
    },
    stop: jest.fn().mockResolvedValue(undefined),
    getAvailableVoicesAsync: async () => [
      { identifier: 'fr', language: 'fr-FR' }, { identifier: 'en-gb', language: 'en-GB' }, { identifier: 'en-us-enh', language: 'en-US', quality: 'Enhanced' }, { identifier: 'en-us', language: 'en-US' },
    ],
  };
  return { engine, spoken };
}

describe('tts', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('lit le texte avec la meilleure voix de la langue', async () => {
    const { engine, spoken } = fakeEngine();
    const p = createTts(engine).speak('Hello there', { lang: 'en-US' });
    await jest.advanceTimersByTimeAsync(50);
    await expect(p).resolves.toBe('done');
    expect(spoken[0].voice).toBe('en-us-enh');
  });
  it('signale une erreur du moteur', async () => {
    const { engine } = fakeEngine('error');
    const p = createTts(engine).speak('Hello');
    await jest.advanceTimersByTimeAsync(50);
    await expect(p).resolves.toBe('error');
  });
  it('ne reste pas bloqué si le moteur ne signale jamais la fin', async () => {
    const { engine } = fakeEngine('silent');
    const p = createTts(engine).speak('Hello there my friend');
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(p).resolves.toBe('done');
  });
  it('une nouvelle lecture interrompt la précédente', async () => {
    const { engine } = fakeEngine('silent');
    const t = createTts(engine);
    const first = t.speak('First sentence is long enough');
    await jest.advanceTimersByTimeAsync(5);
    const second = t.speak('Second');
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(first).resolves.toBe('stopped');
    await expect(second).resolves.toBe('done');
  });
  it('stop() interrompt la lecture en cours', async () => {
    const { engine } = fakeEngine('silent');
    const t = createTts(engine);
    const p = t.speak('A long text that never ends by itself');
    await jest.advanceTimersByTimeAsync(5);
    await t.stop();
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(p).resolves.toBe('stopped');
  });
  it('détecte l\'absence de voix anglaise', async () => {
    const { engine } = fakeEngine();
    expect(await createTts(engine).hasVoice('en-US')).toBe(true);
    const noEn: SpeechEngine = { ...engine, getAvailableVoicesAsync: async () => [{ identifier: 'fr', language: 'fr-FR' }] };
    expect(await createTts(noEn).hasVoice('en-US')).toBe(false);
  });
});
