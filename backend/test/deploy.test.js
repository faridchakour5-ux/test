import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Contrôles statiques du déploiement (Dockerfile, render.yaml): la clé de l'IA ne doit jamais être dans le dépôt,
// le serveur ne tourne pas en administrateur, sa santé est vérifiée et le budget quotidien est actif.
const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, '..');
const repo = path.resolve(backend, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const docker = read(path.join(backend, 'Dockerfile'));
const render = read(path.join(repo, 'render.yaml'));
const serverJs = read(path.join(backend, 'src/server.js'));
const appJs = read(path.join(backend, 'src/app.js'));

test('Dockerfile: image Node 22 légère, production, installation figée sans outils de développement', () => {
  assert.match(docker, /^FROM node:22-alpine$/m);
  assert.match(docker, /^ENV NODE_ENV=production$/m);
  assert.match(docker, /^RUN npm ci --omit=dev$/m); // npm ci = versions exactes du fichier de verrouillage
  assert.match(docker, /^COPY package\.json package-lock\.json \.\/$/m);
});

test('Dockerfile: copie seulement le code du serveur (jamais « COPY . . » qui emporterait des fichiers locaux)', () => {
  const copies = docker.split('\n').filter((l) => l.startsWith('COPY'));
  assert.deepEqual(copies, ['COPY package.json package-lock.json ./', 'COPY src ./src']);
});

test('Dockerfile: exécution sans droits administrateur, santé vérifiée, bonne commande', () => {
  assert.match(docker, /^USER node$/m);
  assert.ok(docker.indexOf('USER node') > docker.indexOf('RUN npm ci'), 'USER après l\'installation');
  assert.match(docker, /^HEALTHCHECK .*\/health/m);
  assert.match(docker, /^CMD \["node", "src\/server\.js"\]$/m);
  assert.match(docker, /^EXPOSE 8787$/m);
});

test('render.yaml: la clé de l\'IA se saisit dans le tableau de bord (sync: false), jamais de valeur dans le dépôt', () => {
  const block = /- key: ANTHROPIC_API_KEY\n([\s\S]*?)(?=\n\s*- key:|$)/.exec(render)[1];
  assert.match(block, /sync: false/);
  assert.doesNotMatch(block, /value:/);
});

test('render.yaml: contrôle de santé, proxy de confiance, budget quotidien actif et modèle cohérent avec le serveur', () => {
  assert.match(render, /healthCheckPath: \/health/);
  assert.match(render, /- key: TRUST_PROXY\n\s+value: "1"/);
  const budget = Number(/- key: DAILY_REQUEST_LIMIT\n\s+value: "(\d+)"/.exec(render)[1]);
  assert.ok(budget > 0 && budget <= 50_000, `budget quotidien raisonnable (${budget})`);
  const model = /- key: KALAM_MODEL\n\s+value: (\S+)/.exec(render)[1];
  assert.equal(/'(claude-[\w-]+)'/.exec(serverJs)[1], model);
  assert.equal(/model = '(claude-[\w-]+)'/.exec(appJs)[1], model);
  assert.match(render, /dockerContext: \.\/backend/);
});

test('la clé n\'est lue que depuis l\'environnement du serveur', () => {
  assert.match(serverJs, /process\.env\.ANTHROPIC_API_KEY \? new Anthropic\(/);
  assert.doesNotMatch(serverJs, /apiKey\s*:/);
});

test('aucune clé d\'API dans le dépôt (hors dépendances)', () => {
  const found = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|mjs|cjs|ts|tsx|json|md|yml|yaml|env|txt|sh)$/.test(e.name) && e.name !== 'Dockerfile') continue;
      const text = read(p);
      if (/sk-ant-[A-Za-z0-9_-]{10,}/.test(text) && !p.endsWith('deploy.test.js')) found.push(path.relative(repo, p));
    }
  };
  walk(repo);
  assert.deepEqual(found, []);
});

test('verrouillage des dépendances présent (installation reproductible)', () => {
  const lock = JSON.parse(read(path.join(backend, 'package-lock.json')));
  assert.ok(lock.lockfileVersion >= 2);
  const pkg = JSON.parse(read(path.join(backend, 'package.json')));
  assert.deepEqual(Object.keys(pkg.dependencies), ['@anthropic-ai/sdk']);
  assert.equal(pkg.type, 'module');
  assert.ok(lock.packages['node_modules/@anthropic-ai/sdk'], 'le SDK est figé dans le verrouillage');
});
