import { TeacherError, askTeacherStream } from './teacher';

const req = { ageProfile: 'adult', level: 'A1', scenario: 's', uiLang: 'fr', messages: [{ role: 'user', content: 'Hi' }] } as const;
const R = () => ({ ...req, messages: [...req.messages] });
const sleep = jest.fn().mockResolvedValue(undefined);
const enc = new TextEncoder();
const sse = (...events: object[]) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');

// Réponse HTTP simulée dont le corps arrive par morceaux, comme sur le réseau.
function streamResponse(chunks: string[], { failAfter, status = 200, onCancel }: { failAfter?: number; status?: number; onCancel?: () => void } = {}) {
  let i = 0;
  return {
    ok: status < 400, status,
    body: {
      getReader: () => ({
        cancel: async () => { onCancel?.(); },
        read: async () => {
          if (failAfter !== undefined && i === failAfter) throw new TypeError('Network connection lost');
          if (i >= chunks.length) return { done: true, value: undefined };
          return { done: false, value: enc.encode(chunks[i++]) };
        },
      }),
    },
    text: async () => chunks.join(''),
  };
}
const as = (f: jest.Mock) => f as unknown as typeof fetch;

beforeEach(() => sleep.mockClear());

describe('askTeacherStream', () => {
  it('libère la connexion une fois la réponse terminée (le lecteur est fermé)', async () => {
    const onCancel = jest.fn();
    const f = jest.fn().mockResolvedValue(streamResponse([sse({ delta: 'Hi' }), sse({ done: true }), sse({ delta: 'ignoré' })], { onCancel }));
    const r = await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: () => {} });
    expect(r.text).toBe('Hi');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('une fermeture du lecteur qui échoue ne casse pas la réponse', async () => {
    const res = streamResponse([sse({ delta: 'Hi' }), sse({ done: true })]);
    const original = res.body.getReader;
    res.body.getReader = () => ({ ...original(), cancel: async () => { throw new Error('déjà fermé'); } });
    const r = await askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(res)), sleep, onDelta: () => {} });
    expect(r).toEqual({ text: 'Hi', partial: false });
  });

  it('transmet chaque morceau dès qu\'il arrive puis renvoie le texte complet', async () => {
    const f = jest.fn().mockResolvedValue(streamResponse([sse({ delta: 'Hello' }), sse({ delta: ' there!' }), sse({ done: true })]));
    const parts: string[] = [];
    const r = await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: (d) => parts.push(d) });
    expect(parts).toEqual(['Hello', ' there!']);
    expect(r).toEqual({ text: 'Hello there!', partial: false });
    expect(f.mock.calls[0][0]).toMatch(/\/chat\/stream$/);
  });

  it('reconstitue un évènement coupé en deux par le réseau', async () => {
    const all = sse({ delta: 'Good' }, { delta: ' morning' }, { done: true });
    const f = jest.fn().mockResolvedValue(streamResponse([all.slice(0, 9), all.slice(9, 31), all.slice(31)]));
    const r = await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: () => {} });
    expect(r.text).toBe('Good morning');
  });

  it('coupure en plein flux: garde le texte reçu, sans nouvelle tentative', async () => {
    const f = jest.fn().mockResolvedValue(streamResponse([sse({ delta: 'Half a sentence' })], { failAfter: 1 }));
    const parts: string[] = [];
    const r = await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: (d) => parts.push(d) });
    expect(r).toEqual({ text: 'Half a sentence', partial: true });
    expect(f).toHaveBeenCalledTimes(1); // jamais de 2e essai: ça répéterait des phrases à voix haute
    expect(parts).toEqual(['Half a sentence']);
  });

  it('évènement « error » du serveur après du texte: texte gardé, marqué partiel', async () => {
    const f = jest.fn().mockResolvedValue(streamResponse([sse({ delta: 'Hel' }, { error: 'teacher unavailable' })]));
    const r = await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: () => {} });
    expect(r).toEqual({ text: 'Hel', partial: true });
  });

  it('flux terminé sans « done » mais avec du texte: partiel', async () => {
    const f = jest.fn().mockResolvedValue(streamResponse([sse({ delta: 'No done event' })]));
    expect((await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: () => {} })).partial).toBe(true);
  });

  it('réessaie tant qu\'AUCUN texte n\'est arrivé (erreur serveur puis succès)', async () => {
    const f = jest.fn().mockResolvedValueOnce(streamResponse([], { status: 502 })).mockResolvedValueOnce(streamResponse([sse({ delta: 'Hi!' }, { done: true })]));
    const r = await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: () => {} });
    expect(r.text).toBe('Hi!');
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('réessaie après une coupure réseau avant le premier morceau', async () => {
    const f = jest.fn().mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValueOnce(streamResponse([sse({ delta: 'Back', }, { done: true })]));
    expect((await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: () => {} })).text).toBe('Back');
  });

  it('échoue en « offline » après toutes les tentatives', async () => {
    const f = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(askTeacherStream(R(), { fetchImpl: as(f), sleep, retries: 1, onDelta: () => {} })).rejects.toMatchObject({ kind: 'offline' });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('n\'insiste pas sur une requête invalide (400) ni sur une mauvaise configuration', async () => {
    const f = jest.fn().mockResolvedValue(streamResponse([], { status: 400 }));
    await expect(askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: () => {} })).rejects.toMatchObject({ kind: 'invalid', retryable: false });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('flux vide: erreur serveur réessayable', async () => {
    const f = jest.fn().mockResolvedValue(streamResponse([sse({ done: true })]));
    await expect(askTeacherStream(R(), { fetchImpl: as(f), sleep, retries: 0, onDelta: () => {} })).rejects.toBeInstanceOf(TeacherError);
  });

  it('repli quand la lecture au fil de l\'eau n\'existe pas: on lit tout puis on rejoue', async () => {
    const f = jest.fn().mockResolvedValue({ ok: true, status: 200, body: null, text: async () => sse({ delta: 'All ' }, { delta: 'at once' }, { done: true }) });
    const parts: string[] = [];
    const r = await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: (d) => parts.push(d) });
    expect(r).toEqual({ text: 'All at once', partial: false });
    expect(parts).toEqual(['All ', 'at once']);
  });

  it('délai dépassé avant le premier morceau = « timeout »', async () => {
    jest.useFakeTimers();
    const f = jest.fn().mockImplementation((_u: string, init: { signal: AbortSignal }) => new Promise((_res, rej) => {
      init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const p = askTeacherStream(R(), { fetchImpl: as(f), sleep, retries: 0, firstByteMs: 1000, onDelta: () => {} });
    const assertion = expect(p).rejects.toMatchObject({ kind: 'timeout' });
    await jest.advanceTimersByTimeAsync(1500);
    await assertion;
    jest.useRealTimers();
  });

  it('annulée avant de commencer: aucune requête, aucune erreur à afficher', async () => {
    const f = jest.fn();
    const c = new AbortController();
    c.abort();
    await expect(askTeacherStream(R(), { fetchImpl: as(f), sleep, signal: c.signal, onDelta: () => {} })).rejects.toMatchObject({ kind: 'cancelled', retryable: false });
    expect(f).not.toHaveBeenCalled();
  });

  it('annulée en plein flux: la requête est coupée, pas de nouvelle tentative', async () => {
    const c = new AbortController();
    let aborted = false;
    const f = jest.fn().mockImplementation((_u: string, init: { signal: AbortSignal }) => {
      init.signal.addEventListener('abort', () => { aborted = true; });
      let i = 0;
      return Promise.resolve({
        ok: true, status: 200,
        body: { getReader: () => ({ read: async () => {
          if (i++ === 0) return { done: false, value: enc.encode(sse({ delta: 'Starting to talk' })) };
          c.abort(); // l'utilisateur interrompt pendant la lecture
          throw Object.assign(new Error('aborted'), { name: 'AbortError' });
        } }) },
      });
    });
    await expect(askTeacherStream(R(), { fetchImpl: as(f), sleep, signal: c.signal, onDelta: () => {} })).rejects.toMatchObject({ kind: 'cancelled' });
    expect(aborted).toBe(true); // la requête réseau a bien été coupée
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('ne laisse pas d\'écouteur d\'annulation après la fin', async () => {
    const c = new AbortController();
    const add = jest.spyOn(c.signal, 'addEventListener');
    const remove = jest.spyOn(c.signal, 'removeEventListener');
    const f = jest.fn().mockResolvedValue(streamResponse([sse({ delta: 'Done here', }, { done: true })]));
    await askTeacherStream(R(), { fetchImpl: as(f), sleep, signal: c.signal, onDelta: () => {} });
    expect(remove).toHaveBeenCalledTimes(add.mock.calls.length);
  });
});
