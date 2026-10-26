import { TeacherError, askTeacher, askTeacherStream, resolveApiUrl, streamingEnabled } from './teacher';

const req = { ageProfile: 'adult', level: 'A1', scenario: 's', uiLang: 'fr', messages: [{ role: 'user', content: 'Hi' }] } as const;
const R = () => ({ ...req, messages: [...req.messages] });
const enc = new TextEncoder();
const sse = (...events: object[]) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
const as = (f: jest.Mock) => f as unknown as typeof fetch;
const okJson = (reply: unknown) => ({ ok: true, status: 200, json: async () => ({ reply }) });
const bad = (s: number) => ({ ok: false, status: s, json: async () => ({}) });
const streamRes = (chunks: string[], status = 200) => {
  let i = 0;
  return { ok: status < 400, status, body: { getReader: () => ({ cancel: async () => {}, read: async () => (i >= chunks.length ? { done: true, value: undefined } : { done: false, value: enc.encode(chunks[i++]) }) }) }, text: async () => chunks.join('') };
};
const fail = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as TeacherError; } throw new Error('aurait dû échouer'); };

afterEach(() => jest.restoreAllMocks());

describe('adresse du serveur', () => {
  it('production: https obligatoire avec un nom d\'hôte, barres finales retirées', () => {
    expect(resolveApiUrl('https://api.kalam.app', false)).toBe('https://api.kalam.app');
    expect(resolveApiUrl('https://api.kalam.app///', false)).toBe('https://api.kalam.app');
    expect(resolveApiUrl('HTTPS://api.kalam.app/v1/', false)).toBe('HTTPS://api.kalam.app/v1');
    for (const u of ['http://api.kalam.app', 'https://', 'https:// x', 'ftp://x', ' https://x.io', 'x https://y.io', '']) expect(() => resolveApiUrl(u, false)).toThrow(TeacherError);
  });
  it('développement: http et n\'importe quel hôte acceptés; la barre finale est retirée (sinon « //chat » donne 404)', () => {
    expect(resolveApiUrl('http://localhost:8787/', true)).toBe('http://localhost:8787');
    expect(resolveApiUrl('http://192.168.1.5:8787///', true)).toBe('http://192.168.1.5:8787');
    expect(resolveApiUrl('http://localhost:8787', true)).toBe('http://localhost:8787');
  });
  it('l\'erreur de configuration porte le bon type et n\'est pas réessayable', () => {
    try { resolveApiUrl('http://x', false); } catch (e) { expect(e).toMatchObject({ kind: 'config', retryable: false, name: 'TeacherError' }); expect((e as Error).message).toMatch(/https/); }
  });
  it('le flux est activé seulement par EXPO_PUBLIC_STREAMING=1', () => {
    const old = process.env.EXPO_PUBLIC_STREAMING;
    try {
      process.env.EXPO_PUBLIC_STREAMING = '1'; expect(streamingEnabled()).toBe(true);
      process.env.EXPO_PUBLIC_STREAMING = '0'; expect(streamingEnabled()).toBe(false);
      process.env.EXPO_PUBLIC_STREAMING = 'true'; expect(streamingEnabled()).toBe(false);
      delete process.env.EXPO_PUBLIC_STREAMING; expect(streamingEnabled()).toBe(false);
    } finally { if (old === undefined) delete process.env.EXPO_PUBLIC_STREAMING; else process.env.EXPO_PUBLIC_STREAMING = old; }
  });
});

describe('askTeacher: requête et erreurs exactes', () => {
  it('envoie un POST JSON vers /chat avec la requête complète', async () => {
    const f = jest.fn().mockResolvedValue(okJson('ok'));
    await askTeacher(R(), { fetchImpl: as(f), sleep: async () => {} });
    const [url, init] = f.mock.calls[0];
    expect(url).toMatch(/\/chat$/);
    expect(url).not.toMatch(/stream/);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual(R());
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
  it('types et messages d\'erreur selon le statut', async () => {
    const cases: [number, string, boolean, string | RegExp][] = [[429, 'rate', true, 'rate'], [500, 'server', true, 'teacher error 500'], [503, 'server', true, 'teacher error 503'], [499, 'invalid', false, 'teacher error 499'], [400, 'invalid', false, 'teacher error 400'], [404, 'invalid', false, 'teacher error 404']];
    for (const [status, kind, retryable, message] of cases) {
      const e = await fail(askTeacher(R(), { fetchImpl: as(jest.fn().mockResolvedValue(bad(status))), sleep: async () => {} }));
      expect(e).toMatchObject({ kind, retryable, message });
    }
  });
  it('500 pile est une panne serveur, 499 non', async () => {
    expect((await fail(askTeacher(R(), { fetchImpl: as(jest.fn().mockResolvedValue(bad(500))), retries: 0 }))).kind).toBe('server');
    expect((await fail(askTeacher(R(), { fetchImpl: as(jest.fn().mockResolvedValue(bad(499))), retries: 0 }))).kind).toBe('invalid');
  });
  it('réponse illisible ou sans texte: erreur serveur réessayable avec le bon message', async () => {
    const badJson = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('x'); } });
    expect(await fail(askTeacher(R(), { fetchImpl: as(badJson), retries: 0 }))).toMatchObject({ kind: 'server', retryable: true, message: 'bad json' });
    for (const reply of [undefined, '', null, 0]) {
      expect(await fail(askTeacher(R(), { fetchImpl: as(jest.fn().mockResolvedValue(okJson(reply))), retries: 0 }))).toMatchObject({ kind: 'server', retryable: true, message: 'empty reply' });
    }
  });
  it('une erreur inattendue (pas une TeacherError) devient une erreur serveur réessayable', async () => {
    const f = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ reply: 'x' }), get headers() { throw new Error('x'); } });
    expect(await askTeacher(R(), { fetchImpl: as(f), retries: 0 })).toBe('x');
    const weird = jest.fn().mockImplementation(() => { throw 'chaîne lancée'; });
    expect(await fail(askTeacher(R(), { fetchImpl: as(weird), retries: 0 }))).toMatchObject({ kind: 'offline', retryable: true });
  });
  it('coupure réseau = offline; AbortError = timeout; les deux réessayables', async () => {
    const off = await fail(askTeacher(R(), { fetchImpl: as(jest.fn().mockRejectedValue(new TypeError('Network request failed'))), retries: 0 }));
    expect(off).toMatchObject({ kind: 'offline', retryable: true });
    const abortErr = Object.assign(new Error('a'), { name: 'AbortError' });
    const to = await fail(askTeacher(R(), { fetchImpl: as(jest.fn().mockRejectedValue(abortErr)), retries: 0 }));
    expect(to).toMatchObject({ kind: 'timeout', retryable: true });
    const nul = await fail(askTeacher(R(), { fetchImpl: as(jest.fn().mockRejectedValue(null)), retries: 0 }));
    expect(nul.kind).toBe('offline');
  });
});

describe('nouvelles tentatives', () => {
  it('3 essais par défaut (1 + 2), attentes 600 ms puis 1 200 ms plus un petit hasard', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const sleep = jest.fn().mockResolvedValue(undefined);
    const f = jest.fn().mockResolvedValue(bad(503));
    await fail(askTeacher(R(), { fetchImpl: as(f), sleep }));
    expect(f).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([700, 1300]);
  });
  it('nombre de nouvelles tentatives réglable; 0 = un seul essai sans attente', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const f = jest.fn().mockResolvedValue(bad(503));
    await fail(askTeacher(R(), { fetchImpl: as(f), sleep, retries: 3 }));
    expect(f).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
    const g = jest.fn().mockResolvedValue(bad(503));
    const s2 = jest.fn();
    await fail(askTeacher(R(), { fetchImpl: as(g), sleep: s2, retries: 0 }));
    expect(g).toHaveBeenCalledTimes(1);
    expect(s2).not.toHaveBeenCalled();
  });
  it('le hasard ajoute entre 0 et 199 ms', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    await fail(askTeacher(R(), { fetchImpl: as(jest.fn().mockResolvedValue(bad(503))), sleep, retries: 1 }));
    expect(sleep).toHaveBeenCalledWith(799);
  });
  it('une requête invalide n\'est jamais réessayée', async () => {
    const f = jest.fn().mockResolvedValue(bad(400));
    const sleep = jest.fn();
    await fail(askTeacher(R(), { fetchImpl: as(f), sleep }));
    expect(f).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
  it('sans option « sleep », la vraie attente est utilisée (minuteries simulées)', async () => {
    jest.useFakeTimers();
    try {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const f = jest.fn().mockResolvedValueOnce(bad(503)).mockResolvedValueOnce(okJson('ok'));
      const p = askTeacher(R(), { fetchImpl: as(f) });
      await jest.advanceTimersByTimeAsync(599);
      expect(f).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(2);
      expect(await p).toBe('ok');
    } finally { jest.useRealTimers(); }
  });
});

describe('délai maximal par tentative', () => {
  it('20 s par défaut: la requête est annulée au bout, erreur « timeout »', async () => {
    jest.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const f = jest.fn().mockImplementation((_u, init) => new Promise((_res, rej) => {
        signal = init.signal;
        init.signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' })));
      }));
      const p = fail(askTeacher(R(), { fetchImpl: as(f), retries: 0 }));
      await jest.advanceTimersByTimeAsync(19_999);
      expect(signal?.aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(2);
      expect((await p).kind).toBe('timeout');
    } finally { jest.useRealTimers(); }
  });
  it('la minuterie est libérée après la réponse (aucune fuite)', async () => {
    jest.useFakeTimers();
    try {
      await askTeacher(R(), { fetchImpl: as(jest.fn().mockResolvedValue(okJson('ok'))), retries: 0 });
      expect(jest.getTimerCount()).toBe(0);
      await fail(askTeacher(R(), { fetchImpl: as(jest.fn().mockRejectedValue(new Error('x'))), retries: 0 }));
      expect(jest.getTimerCount()).toBe(0);
    } finally { jest.useRealTimers(); }
  });
});

describe('askTeacherStream: requête, erreurs et temporisations', () => {
  const noSleep = async () => {};
  it('POST vers /chat/stream avec Accept: text/event-stream', async () => {
    const f = jest.fn().mockResolvedValue(streamRes([sse({ delta: 'Hi' }), sse({ done: true })]));
    await askTeacherStream(R(), { fetchImpl: as(f), sleep: noSleep, onDelta: () => {} });
    const [url, init] = f.mock.calls[0];
    expect(url).toMatch(/\/chat\/stream$/);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Accept: 'text/event-stream' });
    expect(JSON.parse(init.body)).toEqual(R());
  });
  it('types et messages d\'erreur selon le statut (comme sans flux)', async () => {
    const cases: [number, string, boolean, string][] = [[429, 'rate', true, 'rate'], [500, 'server', true, 'teacher error 500'], [502, 'server', true, 'teacher error 502'], [400, 'invalid', false, 'teacher error 400'], [499, 'invalid', false, 'teacher error 499']];
    for (const [status, kind, retryable, message] of cases) {
      const e = await fail(askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue({ ok: false, status, body: null, text: async () => '' })), sleep: noSleep, retries: 0, onDelta: () => {} }));
      expect(e).toMatchObject({ kind, retryable, message });
    }
  });
  it('évènement « error » avant tout texte: « stream error »; flux vide: « empty reply »', async () => {
    const e1 = await fail(askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(streamRes([sse({ error: 'x' })]))), sleep: noSleep, retries: 0, onDelta: () => {} }));
    expect(e1).toMatchObject({ kind: 'server', retryable: true, message: 'stream error' });
    const e2 = await fail(askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(streamRes([sse({ done: true })]))), sleep: noSleep, retries: 0, onDelta: () => {} }));
    expect(e2).toMatchObject({ kind: 'server', retryable: true, message: 'empty reply' });
  });
  it('« done » seul, « error » seul et texte sans fin donnent partiel / complet comme attendu', async () => {
    const full = await askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(streamRes([sse({ delta: 'a' }), sse({ done: true })]))), sleep: noSleep, onDelta: () => {} });
    expect(full).toEqual({ text: 'a', partial: false });
    const withErr = await askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(streamRes([sse({ delta: 'a' }), sse({ error: 'x' })]))), sleep: noSleep, onDelta: () => {} });
    expect(withErr).toEqual({ text: 'a', partial: true });
    const noEnd = await askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(streamRes([sse({ delta: 'a' })]))), sleep: noSleep, onDelta: () => {} });
    expect(noEnd).toEqual({ text: 'a', partial: true });
  });
  it('un évènement qui contient « delta » ET « error »: le texte compte, l\'erreur est ignorée', async () => {
    const r = await askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(streamRes([sse({ delta: 'a', error: 'x' }), sse({ done: true })]))), sleep: noSleep, onDelta: () => {} });
    expect(r).toEqual({ text: 'a', partial: false });
  });
  it('on arrête de lire dès « done » (les morceaux suivants ne sont pas lus)', async () => {
    const reads = jest.fn();
    const res = streamRes([sse({ delta: 'a' }), sse({ done: true }), sse({ delta: 'b' })]);
    const inner = res.body.getReader;
    res.body.getReader = () => { const r = inner(); return { ...r, read: async () => { reads(); return r.read(); } }; };
    const got: string[] = [];
    const r = await askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(res)), sleep: noSleep, onDelta: (d) => got.push(d) });
    expect(r.text).toBe('a');
    expect(got).toEqual(['a']);
    expect(reads).toHaveBeenCalledTimes(2);
  });
  it('un morceau UTF-8 coupé au milieu d\'un caractère est recollé', async () => {
    const bytes = enc.encode(sse({ delta: 'é' }) + sse({ done: true }));
    const cut = bytes.indexOf(0xc3) + 1; // entre les deux octets de « é »
    let i = 0;
    const parts = [bytes.slice(0, cut), bytes.slice(cut)];
    const res = { ok: true, status: 200, body: { getReader: () => ({ cancel: async () => {}, read: async () => (i >= parts.length ? { done: true, value: undefined } : { done: false, value: parts[i++] }) }) }, text: async () => '' };
    const r = await askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(res)), sleep: noSleep, onDelta: () => {} });
    expect(r.text).toBe('é');
  });
  it('attentes entre tentatives: mêmes valeurs que sans flux; pas de nouvelle tentative une fois du texte reçu', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const sleep = jest.fn().mockResolvedValue(undefined);
    await fail(askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue({ ok: false, status: 503, body: null, text: async () => '' })), sleep, onDelta: () => {} }));
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([700, 1300]);
    // du texte reçu puis une coupure: pas de nouvelle tentative (ça répéterait des phrases)
    const f = jest.fn().mockResolvedValue({ ok: true, status: 200, body: { getReader: () => ({ cancel: async () => {}, read: jest.fn().mockResolvedValueOnce({ done: false, value: enc.encode(sse({ delta: 'a' })) }).mockRejectedValueOnce(new TypeError('coupé')) }) }, text: async () => '' });
    const r = await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: () => {} });
    expect(r).toEqual({ text: 'a', partial: true });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('erreur après du texte reçu par un essai précédent: ne réessaie pas', async () => {
    const sleep = jest.fn();
    const f = jest.fn()
      .mockResolvedValueOnce(streamRes([sse({ delta: 'a' }), sse({ error: 'x' })]));
    const got: string[] = [];
    const r = await askTeacherStream(R(), { fetchImpl: as(f), sleep, onDelta: (d) => got.push(d) });
    expect(r.partial).toBe(true);
    expect(got).toEqual(['a']);
    expect(sleep).not.toHaveBeenCalled();
  });
  it('délai avant le premier morceau (20 s) et silence entre morceaux (15 s) réglables', async () => {
    jest.useFakeTimers();
    try {
      let aborted = false;
      const f = jest.fn().mockImplementation((_u, init) => new Promise((_res, rej) => { init.signal.addEventListener('abort', () => { aborted = true; rej(Object.assign(new Error('a'), { name: 'AbortError' })); }); }));
      const p = fail(askTeacherStream(R(), { fetchImpl: as(f), sleep: noSleep, retries: 0, onDelta: () => {} }));
      await jest.advanceTimersByTimeAsync(19_999);
      expect(aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(2);
      expect((await p).kind).toBe('timeout');
      expect(jest.getTimerCount()).toBe(0);
    } finally { jest.useRealTimers(); }
  });
  it('silence entre deux morceaux plus long que idleMs: coupure, texte déjà reçu gardé', async () => {
    jest.useFakeTimers();
    try {
      let n = 0;
      let releaseRead: () => void = () => {};
      const res = { ok: true, status: 200, body: { getReader: () => ({ cancel: async () => {}, read: (): Promise<{ done: boolean; value?: Uint8Array }> => {
        n++;
        if (n === 1) return Promise.resolve({ done: false, value: enc.encode(sse({ delta: 'a' })) });
        return new Promise((_res, rej) => { releaseRead = () => rej(new TypeError('coupé')); }); // plus rien n'arrive
      } }) }, text: async () => '' };
      const controllerSignals: AbortSignal[] = [];
      const f = jest.fn().mockImplementation((_u, init) => { controllerSignals.push(init.signal); return Promise.resolve(res); });
      const p = askTeacherStream(R(), { fetchImpl: as(f), sleep: noSleep, retries: 0, idleMs: 5000, firstByteMs: 9000, onDelta: () => {} });
      await jest.advanceTimersByTimeAsync(4999);
      expect(controllerSignals[0].aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(2);
      expect(controllerSignals[0].aborted).toBe(true);
      releaseRead(); // le réseau finit par signaler la coupure
      expect(await p).toEqual({ text: 'a', partial: true });
    } finally { jest.useRealTimers(); }
  });
});

describe('corrections issues d\'une revue de code', () => {
  it('le délai couvre aussi la lecture du corps: un serveur qui envoie les en-têtes puis se tait donne « timeout », pas un écran bloqué', async () => {
    const fetchImpl = jest.fn().mockImplementation((_url: string, init: { signal: AbortSignal }) => Promise.resolve({
      ok: true, status: 200,
      json: () => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('a'), { name: 'AbortError' })))),
    }));
    const e = await fail(askTeacher(R(), { fetchImpl: as(fetchImpl), timeoutMs: 30, retries: 0, sleep: async () => {} }));
    expect(e).toMatchObject({ kind: 'timeout', retryable: true });
  });
  it('corps illisible (pas de délai dépassé): toujours « server »', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } });
    const e = await fail(askTeacher(R(), { fetchImpl: as(fetchImpl), retries: 0, sleep: async () => {} }));
    expect(e).toMatchObject({ kind: 'server' });
  });
  it('flux: le dernier évènement « done » sans ligne vide finale compte (réponse complète, pas « partielle »)', async () => {
    const chunks = [sse({ delta: 'Hello' }), 'data: {"done":true}\n'];
    const r = await askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(streamRes(chunks))), sleep: async () => {}, onDelta: () => {} });
    expect(r).toEqual({ text: 'Hello', partial: false });
  });
  it('flux sans lecture au fil de l\'eau: même chose avec le texte entier', async () => {
    const res = { ok: true, status: 200, body: undefined, text: async () => `${sse({ delta: 'Hi' })}data: {"done":true}` };
    const r = await askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(res)), sleep: async () => {}, onDelta: () => {} });
    expect(r).toEqual({ text: 'Hi', partial: false });
  });
  it('un évènement qui porte du texte ET « done » est complet', async () => {
    const r = await askTeacherStream(R(), { fetchImpl: as(jest.fn().mockResolvedValue(streamRes([sse({ delta: 'Bye!', done: true })]))), sleep: async () => {}, onDelta: () => {} });
    expect(r).toEqual({ text: 'Bye!', partial: false });
  });
});
