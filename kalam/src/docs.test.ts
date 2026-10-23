import fs from 'node:fs';
import path from 'node:path';

// La documentation ne doit pas devenir fausse: chaque chemin cité entre accents graves doit exister.
const root = path.resolve(__dirname, '../..');
const docs = ['docs/ARCHITECTURE.md', 'docs/APPRENDRE.md', 'README.md', 'PUBLISHING.md', 'PRIVACY.md'];

// Ne retient que les chemins complets (kalam/..., backend/..., docs/..., .github/...), pas les exemples ni les commandes.
const PATH = /`((?:kalam|backend|docs|\.github)\/[A-Za-z0-9_.\/-]+)`/g;

describe('documentation', () => {
  for (const doc of docs) {
    const file = path.join(root, doc);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const cited = [...new Set([...text.matchAll(PATH)].map((m) => m[1].replace(/\/$/, '')))];

    it(`${doc}: tous les chemins cités existent (${cited.length})`, () => {
      const missing = cited.filter((p) => !fs.existsSync(path.join(root, p)));
      expect(missing).toEqual([]);
    });
  }

  it('l\'architecture cite bien les fichiers clés', () => {
    const text = fs.readFileSync(path.join(root, 'docs/ARCHITECTURE.md'), 'utf8');
    for (const key of ['kalam/src/domain/voiceTurn.ts', 'backend/src/app.js', 'kalam/src/api/contract.test.ts']) expect(text).toContain(key);
  });

  it('aucun secret n\'est écrit dans la documentation', () => {
    for (const doc of docs) {
      const file = path.join(root, doc);
      if (!fs.existsSync(file)) continue;
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(/sk-ant-[A-Za-z0-9_-]{10,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}/);
    }
  });
});

// ---------- Les chiffres et les commandes écrits dans la documentation doivent rester vrais ----------
const readme = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const scripts = (pkg: string) => Object.keys(JSON.parse(fs.readFileSync(path.join(root, pkg, 'package.json'), 'utf8')).scripts ?? {});

describe('documentation: pas de chiffres périmés, commandes réelles', () => {
  const written = ['README.md', 'kalam/README.md', 'docs/ARCHITECTURE.md', 'docs/APPRENDRE.md', 'PUBLISHING.md'].filter((d) => fs.existsSync(path.join(root, d)));

  it.each(written)('%s ne recopie pas un nombre de tests (il vieillirait à chaque ajout)', (doc) => {
    expect(readme(doc)).not.toMatch(/\b\d{2,4}\s+tests\b/i);
  });

  it.each(written)('%s: chaque « npm run <script> » existe dans kalam/ ou backend/', (doc) => {
    const known = new Set([...scripts('kalam'), ...scripts('backend')]);
    const used = [...readme(doc).matchAll(/npm run ([a-z][a-z:-]*)/g)].map((m) => m[1]);
    expect(used.filter((s) => !known.has(s))).toEqual([]);
  });

  it('les scripts cités comme « node scripts/… » existent à l\'endroit indiqué', () => {
    expect(fs.existsSync(path.join(root, 'kalam/scripts/make-assets.mjs'))).toBe(true);
    expect(readme('README.md')).toContain('cd kalam && node scripts/make-assets.mjs');
  });

  it('kalam/README.md ne dit plus que le serveur « passera » (il existe) et compte 5 langues d\'interface', () => {
    const text = readme('kalam/README.md');
    expect(text).not.toMatch(/passera/);
    expect(text).toMatch(/5 langues/);
  });
});
