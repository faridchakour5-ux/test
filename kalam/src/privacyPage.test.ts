/* eslint-disable @typescript-eslint/no-require-imports */
import * as fs from 'fs';
import * as path from 'path';
const { markdownToHtml, page } = require('../scripts/privacyPage');

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
});
