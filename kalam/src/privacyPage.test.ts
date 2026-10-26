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
  it('sous-titres, listes numérotées, puces *, liens https et mailto', () => {
    const { body } = markdownToHtml('### Sous-titre\n\n1. un\n2) deux\n\n* puce\n\nÉcrivez à [nous](mailto:contact@exemple.fr) ou voir [le site](https://exemple.fr/p).');
    expect(body).toContain('<h3>Sous-titre</h3>');
    expect(body).toContain('<ol>\n<li>un</li>\n<li>deux</li>\n</ol>');
    expect(body).toContain('<ul>\n<li>puce</li>\n</ul>');
    expect(body).toContain('<a href="mailto:contact@exemple.fr">nous</a>');
    expect(body).toContain('<a href="https://exemple.fr/p">le site</a>');
  });
  it('liens dangereux jamais activés (javascript:, http en clair, data:) et HTML échappé', () => {
    for (const bad of ['javascript:alert(1)', 'http://exemple.fr', 'data:text/html,x']) {
      const { body } = markdownToHtml(`[clic](${bad})`);
      expect(body).not.toContain('<a ');
    }
    expect(markdownToHtml('[<b>x</b>](https://e.fr)').body).toBe('<p><a href="https://e.fr">&lt;b&gt;x&lt;/b&gt;</a></p>');
  });
});
