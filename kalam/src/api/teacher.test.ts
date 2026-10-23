import { TeacherError, askTeacher, resolveApiUrl } from './teacher';

const req = { ageProfile: 'adult', level: 'A1', scenario: 's', uiLang: 'fr', messages: [{ role: 'user', content: 'Hi' }] } as const;
const R = () => ({ ...req, messages: [...req.messages] });
const ok = (reply: string) => ({ ok: true, status: 200, json: async () => ({ reply }) });
const status = (s: number) => ({ ok: false, status: s, json: async () => ({}) });
const sleep = jest.fn().mockResolvedValue(undefined);
const as = (f: jest.Mock) => f as unknown as typeof fetch;

beforeEach(() => sleep.mockClear());

describe('askTeacher', () => {
  it('retourne la réponse du serveur', async () => {
    const f = jest.fn().mockResolvedValue(ok('Hello!'));
    await expect(askTeacher(R(), { fetchImpl: as(f), sleep })).resolves.toBe('Hello!');
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('réessaie après une erreur serveur puis réussit', async () => {
    const f = jest.fn().mockResolvedValueOnce(status(502)).mockResolvedValueOnce(status(503)).mockResolvedValueOnce(ok('Hi'));
    await expect(askTeacher(R(), { fetchImpl: as(f), sleep })).resolves.toBe('Hi');
    expect(f).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
  it('réessaie après une coupure réseau', async () => {
    const f = jest.fn().mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValueOnce(ok('Back'));
    await expect(askTeacher(R(), { fetchImpl: as(f), sleep })).resolves.toBe('Back');
  });
  it('échoue en "offline" après toutes les tentatives', async () => {
    const f = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(askTeacher(R(), { fetchImpl: as(f), sleep, retries: 2 })).rejects.toMatchObject({ kind: 'offline', retryable: true });
    expect(f).toHaveBeenCalledTimes(3);
  });
  it('signale un délai dépassé', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const f = jest.fn().mockRejectedValue(abort);
    await expect(askTeacher(R(), { fetchImpl: as(f), sleep, retries: 0 })).rejects.toMatchObject({ kind: 'timeout' });
  });
  it('429 est réessayé', async () => {
    const f = jest.fn().mockResolvedValueOnce(status(429)).mockResolvedValueOnce(ok('ok'));
    await expect(askTeacher(R(), { fetchImpl: as(f), sleep })).resolves.toBe('ok');
  });
  it('n\'insiste pas sur une requête invalide (400)', async () => {
    const f = jest.fn().mockResolvedValue(status(400));
    await expect(askTeacher(R(), { fetchImpl: as(f), sleep })).rejects.toMatchObject({ kind: 'invalid', retryable: false });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('une réponse vide est une erreur serveur', async () => {
    const f = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await expect(askTeacher(R(), { fetchImpl: as(f), sleep, retries: 0 })).rejects.toBeInstanceOf(TeacherError);
  });
});

describe('resolveApiUrl', () => {
  it('accepte tout en développement (localhost, http)', () => {
    expect(resolveApiUrl('http://localhost:8787', true)).toBe('http://localhost:8787');
  });
  it('exige du HTTPS en production', () => {
    expect(resolveApiUrl('https://api.kalam.app/', false)).toBe('https://api.kalam.app');
    expect(() => resolveApiUrl('http://localhost:8787', false)).toThrow(TeacherError);
    expect(() => resolveApiUrl('http://api.kalam.app', false)).toThrow(/https/);
    expect(() => resolveApiUrl('', false)).toThrow(TeacherError);
    expect(() => resolveApiUrl('https://', false)).toThrow(TeacherError);
  });
  it('l\'erreur de configuration n\'est pas réessayée', () => {
    try { resolveApiUrl('http://x', false); } catch (e) { expect((e as TeacherError)).toMatchObject({ kind: 'config', retryable: false }); }
  });
  it('askTeacher échoue tout de suite avec « config » si le build de production est mal configuré', async () => {
    const g = globalThis as unknown as { __DEV__: boolean };
    const before = g.__DEV__;
    g.__DEV__ = false;
    const f = jest.fn();
    try {
      await expect(askTeacher(R(), { fetchImpl: as(f), sleep })).rejects.toMatchObject({ kind: 'config' });
      expect(f).not.toHaveBeenCalled();
    } finally { g.__DEV__ = before; }
  });
});
