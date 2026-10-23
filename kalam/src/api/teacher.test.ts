import { TeacherError, askTeacher } from './teacher';

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
