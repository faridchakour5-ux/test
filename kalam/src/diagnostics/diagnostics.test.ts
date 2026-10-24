import { DiagnosticDeps, overallStatus, runDiagnostics } from './diagnostics';

const health = (over: Record<string, unknown> = {}, status = 200) => jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => ({ ok: true, configured: true, ...over }) });
const deps = (over: Partial<DiagnosticDeps> = {}): DiagnosticDeps => ({
  serverUrl: () => 'https://api.kalam.app',
  fetchImpl: health() as unknown as typeof fetch,
  voiceLocales: ['en-US', 'fr-FR'],
  hasVoice: async () => true,
  micAvailable: () => true,
  notificationsAvailable: () => true,
  ...over,
});
const by = (r: Awaited<ReturnType<typeof runDiagnostics>>, id: string) => r.find((c) => c.id === id)!;

describe('runDiagnostics', () => {
  it('tout va bien: quatre contrôles, tous « ok »', async () => {
    const r = await runDiagnostics(deps());
    expect(r.map((c) => c.id)).toEqual(['server', 'voice', 'mic', 'notifications']);
    expect(r.every((c) => c.status === 'ok')).toBe(true);
    expect(overallStatus(r)).toBe('ok');
  });

  describe('serveur', () => {
    it('interroge /health en GET sur l\'adresse configurée', async () => {
      const f = health();
      await runDiagnostics(deps({ fetchImpl: f as unknown as typeof fetch }));
      expect(f.mock.calls[0][0]).toBe('https://api.kalam.app/health');
      expect(f.mock.calls[0][1]).toMatchObject({ method: 'GET' });
    });
    it('joignable mais sans clé d\'IA: avertissement « noKey » (le professeur ne répondra pas)', async () => {
      const r = await runDiagnostics(deps({ fetchImpl: health({ configured: false }) as unknown as typeof fetch }));
      expect(by(r, 'server')).toEqual({ id: 'server', status: 'warn', detail: 'noKey' });
    });
    it('adresse absente ou non sécurisée: échec « config », sans appel réseau', async () => {
      const f = health();
      const r = await runDiagnostics(deps({ serverUrl: () => { throw new Error('config'); }, fetchImpl: f as unknown as typeof fetch }));
      expect(by(r, 'server')).toEqual({ id: 'server', status: 'fail', detail: 'config' });
      expect(f).not.toHaveBeenCalled();
    });
    it('erreur HTTP, réponse illisible, réponse inattendue ou panne réseau: échec « down »', async () => {
      const cases: unknown[] = [
        health({}, 500),
        jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('x'); } }),
        jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: false }) }),
        jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => null }),
        jest.fn().mockRejectedValue(new TypeError('Network request failed')),
      ];
      for (const f of cases) expect(by(await runDiagnostics(deps({ fetchImpl: f as typeof fetch })), 'server')).toEqual({ id: 'server', status: 'fail', detail: 'down' });
    });
    it('serveur qui ne répond pas: échec au bout du délai, minuterie libérée', async () => {
      jest.useFakeTimers();
      try {
        const f = jest.fn().mockImplementation((_u, init) => new Promise((_res, rej) => { init.signal.addEventListener('abort', () => rej(new Error('abort'))); }));
        const p = runDiagnostics(deps({ fetchImpl: f as unknown as typeof fetch, timeoutMs: 3000 }));
        await jest.advanceTimersByTimeAsync(2999);
        let done = false; void p.then(() => { done = true; });
        await jest.advanceTimersByTimeAsync(0);
        expect(done).toBe(false);
        await jest.advanceTimersByTimeAsync(2);
        expect(by(await p, 'server')).toEqual({ id: 'server', status: 'fail', detail: 'down' });
        expect(jest.getTimerCount()).toBe(0);
      } finally { jest.useRealTimers(); }
    });
    it('délai par défaut de 8 secondes', async () => {
      jest.useFakeTimers();
      try {
        const f = jest.fn().mockImplementation((_u, init) => new Promise((_res, rej) => { init.signal.addEventListener('abort', () => rej(new Error('abort'))); }));
        const p = runDiagnostics(deps({ fetchImpl: f as unknown as typeof fetch }));
        await jest.advanceTimersByTimeAsync(7999);
        let done = false; void p.then(() => { done = true; });
        await jest.advanceTimersByTimeAsync(0);
        expect(done).toBe(false);
        await jest.advanceTimersByTimeAsync(2);
        await p;
      } finally { jest.useRealTimers(); }
    });
  });

  describe('voix', () => {
    it('une langue sans voix: avertissement avec la langue manquante', async () => {
      const r = await runDiagnostics(deps({ hasVoice: async (l) => l === 'en-US' }));
      expect(by(r, 'voice')).toEqual({ id: 'voice', status: 'warn', detail: 'partial', missing: ['fr-FR'] });
    });
    it('aucune voix: échec', async () => {
      const r = await runDiagnostics(deps({ hasVoice: async () => false }));
      expect(by(r, 'voice')).toEqual({ id: 'voice', status: 'fail', detail: 'none', missing: ['en-US', 'fr-FR'] });
      expect(overallStatus(r)).toBe('fail');
    });
    it('une vérification qui plante compte comme « pas de voix » sans tout casser', async () => {
      const r = await runDiagnostics(deps({ hasVoice: async (l) => { if (l === 'fr-FR') throw new Error('x'); return true; } }));
      expect(by(r, 'voice')).toMatchObject({ status: 'warn', missing: ['fr-FR'] });
    });
  });

  describe('micro et rappels', () => {
    it('pas de reconnaissance vocale: échec du micro; une exception vaut « non »', async () => {
      expect(by(await runDiagnostics(deps({ micAvailable: () => false })), 'mic').status).toBe('fail');
      expect(by(await runDiagnostics(deps({ micAvailable: () => { throw new Error('x'); } })), 'mic').status).toBe('fail');
    });
    it('pas de notifications: simple avertissement, jamais un échec (les rappels sont facultatifs)', async () => {
      const r = await runDiagnostics(deps({ notificationsAvailable: () => false }));
      expect(by(r, 'notifications').status).toBe('warn');
      expect(overallStatus(r)).toBe('warn');
      expect(by(await runDiagnostics(deps({ notificationsAvailable: () => { throw new Error('x'); } })), 'notifications').status).toBe('warn');
    });
  });

  describe('overallStatus', () => {
    it('le pire état l\'emporte', () => {
      const c = (status: 'ok' | 'warn' | 'fail') => ({ id: 'mic' as const, status });
      expect(overallStatus([c('ok'), c('ok')])).toBe('ok');
      expect(overallStatus([c('ok'), c('warn')])).toBe('warn');
      expect(overallStatus([c('warn'), c('fail'), c('ok')])).toBe('fail');
      expect(overallStatus([])).toBe('ok');
    });
  });
});
