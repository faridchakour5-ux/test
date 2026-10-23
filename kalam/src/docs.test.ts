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
