// Transforme PRIVACY.md en page web simple (Google Play exige une adresse publique pour la politique de confidentialité).
// Utilisation: node scripts/privacyPage.js ../PRIVACY.md ../site/privacy.html
const fs = require('fs');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Liens [texte](adresse): seulement https et mailto (jamais javascript: ni autre schéma). Le texte a déjà été échappé.
const link = (s) => s.replace(/\[([^\]]+)\]\((https:\/\/[^\s)"'<>]+|mailto:[^\s)"'<>]+)\)/g, '<a href="$2">$1</a>');
const inline = (s) => link(esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>'));

function markdownToHtml(md) {
  const out = [];
  let list = null; // 'ul' ou 'ol' quand une liste est ouverte
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const open = (kind) => { if (list !== kind) { close(); out.push(`<${kind}>`); list = kind; } };
  let title = 'Politique de confidentialité';
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) { close(); continue; }
    let m;
    if ((m = /^# (.+)/.exec(line))) { close(); title = m[1]; out.push(`<h1>${inline(m[1])}</h1>`); }
    else if ((m = /^### (.+)/.exec(line))) { close(); out.push(`<h3>${inline(m[1])}</h3>`); }
    else if ((m = /^## (.+)/.exec(line))) { close(); out.push(`<h2>${inline(m[1])}</h2>`); }
    else if ((m = /^[-*] (.+)/.exec(line))) { open('ul'); out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = /^\d+[.)] (.+)/.exec(line))) { open('ol'); out.push(`<li>${inline(m[1])}</li>`); }
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return { title, body: out.join('\n') };
}

// Sections réservées à l'équipe (marquées « INTERNE » dans le titre): jamais sur la page publique.
function publicPart(md) {
  const out = [];
  let skipping = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^#{1,2} /.test(line)) skipping = /INTERNE/i.test(line);
    if (!skipping) out.push(line);
  }
  return out.join('\n');
}

function page(md) {
  const { title, body } = markdownToHtml(publicPart(md));
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>body{font:18px/1.6 system-ui,sans-serif;max-width:46rem;margin:0 auto;padding:1.5rem 1rem;color:#1b1a2e;background:#faf8f4}h1{font-size:1.6rem}h2{font-size:1.25rem;margin-top:2rem}h3{font-size:1.1rem;margin-top:1.5rem}a{color:#3b2fa3}code{background:#ece9f7;padding:0 .25em;border-radius:4px}@media(prefers-color-scheme:dark){body{background:#12111f;color:#f1eefc}code{background:#2a2745}}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

// Un texte encore marqué « BROUILLON » n'est pas publié par erreur sur une adresse publique (sauf demande explicite).
const isDraft = (md) => /BROUILLON|à renseigner/i.test(publicPart(md)); // texte public encore incomplet

module.exports = { markdownToHtml, page, esc, isDraft, publicPart };

if (require.main === module) {
  const args = process.argv.slice(2);
  const allowDraft = args.includes('--allow-draft');
  const [src, dest] = args.filter((a) => !a.startsWith('--'));
  if (!src || !dest) { console.error('Usage: node scripts/privacyPage.js PRIVACY.md site/privacy.html [--allow-draft]'); process.exit(2); }
  if (isDraft(fs.readFileSync(src, 'utf8')) && !allowDraft) {
    console.error('PRIVACY.md est encore incomplet (« BROUILLON » ou « à renseigner » dans la partie publique): faites-le valider, complétez-le, puis relancez (ou lancez le workflow avec « allow_draft » pour un essai).');
    process.exit(1);
  }
  fs.mkdirSync(require('path').dirname(dest), { recursive: true });
  fs.writeFileSync(dest, page(fs.readFileSync(src, 'utf8')));
  console.log(`ok: ${dest}`);
}
