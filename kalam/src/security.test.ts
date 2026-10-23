import fs from 'node:fs';
import path from 'node:path';

// Garde-fou: le code de l'APPLICATION ne doit contenir ni clé d'API ni adresse du fournisseur d'IA.
// Tout ce qui est dans l'app peut être extrait par n'importe qui: seul le serveur parle à l'IA.
const appRoot = path.resolve(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx|js|json)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

const FORBIDDEN: [string, RegExp][] = [
  ['clé Anthropic', /sk-ant-/i],
  ['variable de clé d\'API', /ANTHROPIC_API_KEY/],
  ['adresse du fournisseur d\'IA', /anthropic\.com/i],
  ['en-tête de clé d\'API', /x-api-key/i],
  ['clé générique', /(api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_-]{16,}['"]/i],
];

describe('sécurité du code de l\'application', () => {
  const files = [...sourceFiles(path.join(appRoot, 'src')), path.join(appRoot, 'App.tsx'), path.join(appRoot, 'app.json'), path.join(appRoot, 'eas.json')].filter(fs.existsSync);

  it('inspecte bien un grand nombre de fichiers (le test ne surveille pas le vide)', () => {
    expect(files.length).toBeGreaterThan(60);
  });

  it.each(FORBIDDEN)('aucun fichier source ne contient : %s', (_name, pattern) => {
    const offenders = files.filter((f) => pattern.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(appRoot, f));
    expect(offenders).toEqual([]);
  });

  it('les fichiers d\'exemple d\'environnement ne contiennent aucune valeur secrète', () => {
    const example = path.join(appRoot, '.env.example');
    expect(fs.readFileSync(example, 'utf8')).toMatch(/^EXPO_PUBLIC_API_URL=\S+$/m);
    expect(fs.readFileSync(example, 'utf8')).not.toMatch(/KEY|SECRET|TOKEN/i);
  });

  it('seule l\'adresse de NOTRE serveur est configurée côté app (jamais une clé: tout ce qui est EXPO_PUBLIC_ est public)', () => {
    const vars = new Set<string>();
    for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/process\.env\.(EXPO_PUBLIC_[A-Z_]+)/g)) vars.add(m[1]);
    expect([...vars].sort()).toEqual(['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_STREAMING']);
  });
});
