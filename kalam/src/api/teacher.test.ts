import { askTeacher } from './teacher';

const req = { ageProfile: 'adult', level: 'A1', scenario: 's', uiLang: 'fr', messages: [{ role: 'user', content: 'Hi' }] } as const;

describe('askTeacher', () => {
  it('retourne la réponse du serveur', async () => {
    const f = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ reply: 'Hello!' }) });
    await expect(askTeacher({ ...req, messages: [...req.messages] }, f as unknown as typeof fetch)).resolves.toBe('Hello!');
  });
  it('lève une erreur si le serveur échoue', async () => {
    const f = jest.fn().mockResolvedValue({ ok: false, status: 502 });
    await expect(askTeacher({ ...req, messages: [...req.messages] }, f as unknown as typeof fetch)).rejects.toThrow('502');
  });
});
