import { isSpeechInputAvailable, listenOnce } from './recognizer';

describe('recognizer sans module natif (Expo Go, tests)', () => {
  it('est indisponible sans planter', async () => {
    expect(isSpeechInputAvailable()).toBe(false);
    await expect(listenOnce()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });
});
