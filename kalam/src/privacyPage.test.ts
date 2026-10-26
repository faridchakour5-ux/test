/* eslint-disable @typescript-eslint/no-require-imports */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
const { markdownToHtml, page, isDraft } = require('../scripts/privacyPage');

describe('page web de la politique de confidentialité', () => {
  it('titres, listes, gras et code', () => {
    const { title, body } = markdownToHtml('# Titre\n\n## Partie\n- un **gras** et `code`\n- deux\n\nParagraphe');
    expect(title).toBe('Titre');
    expect(body).toBe('<h1>Titre</h1>\n<h2>Partie</h2>\n<ul>\n<li>un <strong>gras</strong> et <code>code</code></li>\n<li>deux</li>\n</ul>\n<p>Paragraphe</p>');
  });
  it('échappe le HTML (aucune injection depuis le texte)', () => {
    expect(markdownToHtml('<script>alert(1)</script> & "x"').body).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;</p>');
  });
  it('le vrai PRIVACY.md donne une page complète, sans script ni appel externe', () => {
    const md = fs.readFileSync(path.join(__dirname, '..', '..', 'PRIVACY.md'), 'utf8');
    const html: string = page(md);
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('Mode enfant');
    expect(html).toContain('Aucune publicité');
    expect(html).not.toMatch(/<script|https?:\/\//i);
    expect((html.match(/<h2>/g) ?? []).length).toBe((md.match(/^## /gm) ?? []).length);
  });
  it('un texte encore marqué BROUILLON n\'est pas publié par erreur (sauf --allow-draft)', () => {
    expect(isDraft('# Politique (BROUILLON — à valider)')).toBe(true);
    expect(isDraft('# Politique de confidentialité')).toBe(false);
    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'kalam-priv-'));
    const src = path.join(dir, 'P.md');
    const out = path.join(dir, 'site', 'privacy.html');
    fs.writeFileSync(src, '# Politique (BROUILLON)\n\n- un point');
    const script = path.join(__dirname, '..', 'scripts', 'privacyPage.js');
    const refused = spawnSync('node', [script, src, out], { encoding: 'utf8' });
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain('BROUILLON');
    expect(fs.existsSync(out)).toBe(false);
    const allowed = spawnSync('node', [script, src, out, '--allow-draft'], { encoding: 'utf8' });
    expect(allowed.status).toBe(0);
    expect(fs.existsSync(out)).toBe(true);
    fs.writeFileSync(src, '# Politique de confidentialité\n\n- un point');
    expect(spawnSync('node', [script, src, out], { encoding: 'utf8' }).status).toBe(0);
  });
});
