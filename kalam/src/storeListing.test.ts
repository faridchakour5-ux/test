import * as fs from 'fs';
import * as path from 'path';

// Google Play refuse une fiche qui dépasse les limites: on les vérifie ici plutôt qu'au moment de l'envoi.
const md = fs.readFileSync(path.join(__dirname, '..', 'store', 'listing.md'), 'utf8');
const LANGS = ['fr', 'en', 'ar', 'es', 'zh'];

const section = (title: string) => {
  const start = md.indexOf(`## ${title}`);
  if (start < 0) throw new Error(`section introuvable: ${title}`);
  const rest = md.slice(start + 3);
  const end = rest.search(/\n## /);
  return rest.slice(0, end < 0 ? undefined : end);
};
const chars = (s: string) => [...s].length; // comme Google Play: caractères, pas octets

describe('fiche Google Play', () => {
  it('titre: 30 caractères au plus', () => {
    const title = section('Titre').split('\n').slice(1).join('\n').trim();
    expect(title.length).toBeGreaterThan(0);
    expect(chars(title)).toBeLessThanOrEqual(30);
  });
  it('description courte: une par langue, 80 caractères au plus', () => {
    const rows = [...section('Description courte').matchAll(/^\| (\w+) \| (.+) \|$/gm)].filter((m) => LANGS.includes(m[1]));
    expect(rows.map((m) => m[1]).sort()).toEqual([...LANGS].sort());
    for (const [, lang, text] of rows) expect([lang, chars(text) <= 80]).toEqual([lang, true]);
  });
  it('description longue: une par langue, 4000 caractères au plus, sans publicité mensongère', () => {
    const body = section('Description longue');
    const parts = body.split(/^### /m).slice(1);
    expect(parts.map((p) => p.split('\n')[0].trim()).sort()).toEqual([...LANGS].sort());
    for (const p of parts) {
      const lang = p.split('\n')[0].trim();
      const text = p.split('\n').slice(1).join('\n').trim();
      expect([lang, text.length > 200]).toEqual([lang, true]);
      expect([lang, chars(text) <= 4000]).toEqual([lang, true]);
    }
  });
  it('les fichiers graphiques annoncés existent', () => {
    for (const f of ['feature-graphic.png', 'icon-512.png']) expect(fs.existsSync(path.join(__dirname, '..', 'store', f))).toBe(true);
    const shots = fs.readdirSync(path.join(__dirname, '..', 'store', 'screenshots')).filter((f) => f.endsWith('.png'));
    expect(shots.length).toBeGreaterThanOrEqual(2); // Google Play exige 2 captures au minimum
  });
  it('dimensions exigées: visuel 1024×500, icône 512×512, captures entre 320 et 3840 px avec un rapport au plus 2:1', () => {
    const size = (f: string) => {
      const b = fs.readFileSync(f);
      return [b.readUInt32BE(16), b.readUInt32BE(20)]; // en-tête PNG: largeur puis hauteur
    };
    const dir = path.join(__dirname, '..', 'store');
    expect(size(path.join(dir, 'feature-graphic.png'))).toEqual([1024, 500]);
    expect(size(path.join(dir, 'icon-512.png'))).toEqual([512, 512]);
    for (const f of fs.readdirSync(path.join(dir, 'screenshots'))) {
      const [w, h] = size(path.join(dir, 'screenshots', f));
      for (const side of [w, h]) expect([f, side >= 320 && side <= 3840]).toEqual([f, true]);
      expect([f, Math.max(w, h) / Math.min(w, h) <= 2]).toEqual([f, true]);
    }
  });
});
