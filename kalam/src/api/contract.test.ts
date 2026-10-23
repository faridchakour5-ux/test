// Test de contrat: le VRAI client de l'application parle à un VRAI serveur HTTP (code du dossier backend/),
// avec une fausse IA. Détecte toute divergence de format entre les deux (flux SSE, champs, erreurs).
import { ChildProcess, spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

type Teacher = typeof import('./teacher');

let server: ChildProcess;
let teacher: Teacher;
let baseUrl = '';

const sleep = async () => undefined;

// Transport HTTP réel (le `fetch` de l'environnement de test d'Expo est une version simulée sans réseau).
// Il reproduit ce dont le client a besoin: statut, json(), text(), corps lisible au fil de l'eau, annulation.
const nodeFetch = ((url: string, init: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) =>
  new Promise((resolve, reject) => {
    const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
    const request = http.request(url, { method: init.method ?? 'GET', headers: init.headers }, (res) => {
      const queue: Buffer[] = [];
      let ended = false;
      let failure: Error | null = null;
      let wake: (() => void) | null = null;
      const notify = () => { wake?.(); wake = null; };
      res.on('data', (c: Buffer) => { queue.push(c); notify(); });
      res.on('end', () => { ended = true; notify(); });
      res.on('error', (e) => { failure = e; notify(); });
      const status = res.statusCode ?? 0;
      const readAll = async () => { const parts: Buffer[] = []; for (;;) { const r = await reader.read(); if (r.done) break; parts.push(Buffer.from(r.value as Uint8Array)); } return Buffer.concat(parts).toString('utf8'); };
      const reader = {
        read: async (): Promise<{ done: boolean; value?: Uint8Array }> => {
          for (;;) {
            if (init.signal?.aborted) throw abortError();
            if (queue.length) return { done: false, value: new Uint8Array(queue.shift() as Buffer) };
            if (failure) throw failure;
            if (ended) return { done: true };
            await new Promise<void>((r) => { wake = r; });
          }
        },
      };
      init.signal?.addEventListener('abort', () => { notify(); res.destroy(); });
      resolve({ ok: status >= 200 && status < 300, status, body: { getReader: () => reader }, text: readAll, json: async () => JSON.parse(await readAll()) });
    });
    request.on('error', (e) => reject(init.signal?.aborted ? abortError() : e));
    init.signal?.addEventListener('abort', () => request.destroy());
    if (init.signal?.aborted) request.destroy();
    request.end(init.body);
  })) as unknown as typeof fetch;
const req = (content: string, over: Record<string, unknown> = {}) => ({
  ageProfile: 'adult', level: 'A1', scenario: 'Restaurant', uiLang: 'fr', messages: [{ role: 'user', content }], ...over,
}) as never;

beforeAll(async () => {
  const script = path.resolve(__dirname, '../../../backend/test/fakeServer.js');
  server = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('le serveur de test ne démarre pas')), 15_000);
    server.stdout?.on('data', (d: Buffer) => { const m = /READY (\d+)/.exec(String(d)); if (m) { clearTimeout(timer); resolve(Number(m[1])); } });
    server.on('error', reject);
    server.on('exit', (code) => reject(new Error(`serveur de test arrêté (${code})`)));
  });
  baseUrl = `http://127.0.0.1:${port}`;
  process.env.EXPO_PUBLIC_API_URL = baseUrl;
  // require voulu: le module lit l'adresse du serveur au chargement, il doit donc être chargé APRÈS avoir fixé la variable
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  jest.isolateModules(() => { teacher = require('./teacher'); });
}, 30_000);

afterAll(() => { server?.kill('SIGTERM'); });

describe('contrat app <-> serveur: réponse simple', () => {
  it('askTeacher reçoit la réponse du serveur', async () => {
    await expect(teacher.askTeacher(req('Hello world'), { sleep, fetchImpl: nodeFetch })).resolves.toBe('Echo: Hello world');
  });
  it('le professeur ouvre la conversation (start) sans message de l\'apprenant', async () => {
    const r = await teacher.askTeacher({ ...(req('x') as object), messages: [], start: true } as never, { sleep, fetchImpl: nodeFetch });
    expect(r).toMatch(/^Echo: \(Start the role-play now/);
  });
  it('panne du serveur: erreur réessayable après les nouvelles tentatives', async () => {
    await expect(teacher.askTeacher(req('FAILNOW please'), { sleep, retries: 1, fetchImpl: nodeFetch })).rejects.toMatchObject({ kind: 'server', retryable: true });
  });
  it('requête refusée par le serveur (langue inconnue): erreur non réessayée', async () => {
    await expect(teacher.askTeacher(req('hi', { targetLang: 'de' }), { sleep, fetchImpl: nodeFetch })).rejects.toMatchObject({ kind: 'invalid', retryable: false });
  });
  it('données personnelles d\'un enfant: refusées par le serveur', async () => {
    await expect(teacher.askTeacher(req('mon mail est a@b.com', { ageProfile: 'kids' }), { sleep, fetchImpl: nodeFetch })).rejects.toMatchObject({ kind: 'invalid' });
  });
  it('données personnelles d\'un adulte: masquées avant d\'arriver à l\'IA', async () => {
    await expect(teacher.askTeacher(req('write to a@b.com'), { sleep, fetchImpl: nodeFetch })).resolves.toBe('Echo: write to [email removed]');
  });
});

describe('contrat app <-> serveur: la langue apprise traverse toute la chaîne', () => {
  it('le français arrive jusqu\'à la consigne du professeur', async () => {
    const r = await teacher.askTeacher(req('SYSTEM?', { targetLang: 'fr' }), { sleep, fetchImpl: nodeFetch });
    expect(r).toMatch(/French conversation teacher/);
    expect(r).toMatch(/always reply in French/);
    expect(r).toContain('Role-play scenario: Restaurant');
  });
  it('sans langue précisée (ancien client): anglais', async () => {
    expect(await teacher.askTeacher(req('SYSTEM?'), { sleep, fetchImpl: nodeFetch })).toMatch(/English conversation teacher/);
  });
  it('le profil enfant donne une consigne enfant', async () => {
    expect(await teacher.askTeacher(req('SYSTEM?', { ageProfile: 'kids' }), { sleep, fetchImpl: nodeFetch })).toMatch(/child aged 4-8/);
  });
});

describe('contrat app <-> serveur: réponse en flux (SSE)', () => {
  it('reçoit la réponse en plusieurs morceaux, identique à la version non-flux', async () => {
    const parts: string[] = [];
    const r = await teacher.askTeacherStream(req('The quick brown fox jumps'), { sleep, fetchImpl: nodeFetch, onDelta: (d) => parts.push(d) });
    expect(parts.length).toBeGreaterThan(3); // vraiment en morceaux
    expect(parts.join('')).toBe('Echo: The quick brown fox jumps');
    expect(r).toEqual({ text: 'Echo: The quick brown fox jumps', partial: false });
    expect(r.text).toBe(await teacher.askTeacher(req('The quick brown fox jumps'), { sleep, fetchImpl: nodeFetch })); // même réponse
  });
  it('panne avant le premier morceau: erreur réessayable', async () => {
    await expect(teacher.askTeacherStream(req('FAILNOW'), { sleep, retries: 0, fetchImpl: nodeFetch, onDelta: () => {} })).rejects.toMatchObject({ kind: 'server' });
  });
  it('panne EN PLEIN flux: le texte déjà reçu est conservé, marqué partiel, sans nouvelle tentative', async () => {
    const parts: string[] = [];
    let calls = 0;
    const r = await teacher.askTeacherStream(req('FAILMID now please'), { sleep, fetchImpl: nodeFetch, onDelta: (d) => { calls++; parts.push(d); } });
    expect(r.partial).toBe(true);
    expect(r.text).toBe('Echo: FAILMID');
    expect(calls).toBe(2); // 2 morceaux reçus, jamais rejoués
  });
  it('la langue apprise et le profil traversent aussi le flux', async () => {
    const r = await teacher.askTeacherStream(req('SYSTEM?', { targetLang: 'fr' }), { sleep, fetchImpl: nodeFetch, onDelta: () => {} });
    expect(r.text).toMatch(/French conversation teacher/);
  });
  it('requête invalide en flux: refusée sans réessai', async () => {
    await expect(teacher.askTeacherStream(req('hi', { level: 'C2' }), { sleep, fetchImpl: nodeFetch, onDelta: () => {} })).rejects.toMatchObject({ kind: 'invalid', retryable: false });
  });
  it('annulation par l\'utilisateur: coupe la requête réseau', async () => {
    const c = new AbortController();
    const p = teacher.askTeacherStream(req('one two three four five six seven eight nine ten'), { sleep, fetchImpl: nodeFetch, signal: c.signal, onDelta: () => c.abort() });
    await expect(p).rejects.toMatchObject({ kind: 'cancelled' });
  });
});
