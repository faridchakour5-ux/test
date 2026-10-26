// Transforme PRIVACY.md en page web simple (Google Play exige une adresse publique pour la politique de confidentialité).
// Utilisation: node scripts/privacyPage.js ../PRIVACY.md ../site/privacy.html
const fs = require('fs');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');

function markdownToHtml(md) {
  const out = [];
  let list = false;
  const close = () => { if (list) { out.push('</ul>'); list = false; } };
  let title = 'Politique de confidentialité';
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) { close(); continue; }
    let m;
    if ((m = /^# (.+)/.exec(line))) { close(); title = m[1]; out.push(`<h1>${inline(m[1])}</h1>`); }
    else if ((m = /^## (.+)/.exec(line))) { close(); out.push(`<h2>${inline(m[1])}</h2>`); }
    else if ((m = /^- (.+)/.exec(line))) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(m[1])}</li>`); }
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return { title, body: out.join('\n') };
}

function page(md) {
  const { title, body } = markdownToHtml(md);
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>body{font:18px/1.6 system-ui,sans-serif;max-width:46rem;margin:0 auto;padding:1.5rem 1rem;color:#1b1a2e;background:#faf8f4}h1{font-size:1.6rem}h2{font-size:1.25rem;margin-top:2rem}code{background:#ece9f7;padding:0 .25em;border-radius:4px}@media(prefers-color-scheme:dark){body{background:#12111f;color:#f1eefc}code{background:#2a2745}}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

module.exports = { markdownToHtml, page, esc };

if (require.main === module) {
  const [src, dest] = process.argv.slice(2);
  if (!src || !dest) { console.error('Usage: node scripts/privacyPage.js PRIVACY.md site/privacy.html'); process.exit(2); }
  fs.mkdirSync(require('path').dirname(dest), { recursive: true });
  fs.writeFileSync(dest, page(fs.readFileSync(src, 'utf8')));
  console.log(`ok: ${dest}`);
}
