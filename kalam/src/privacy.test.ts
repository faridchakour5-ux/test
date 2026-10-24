import fs from 'node:fs';
import path from 'node:path';

// Garde-fou de confidentialité (voir PRIVACY.md): aucun outil de suivi ou de publicité, et le réseau n'est utilisé que par
// le client du professeur et par le diagnostic (qui n'interroge que /health du même serveur).
const ROOT = path.resolve(__dirname, '..');
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(p)) : [p];
});
const sources = [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'App.tsx')].filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
const read = (f: string) => fs.readFileSync(f, 'utf8');
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');

describe('confidentialité: garde-fous du code', () => {
  it('aucune dépendance de suivi, de statistiques, de plantages à distance ou de publicité', () => {
    const pkg = JSON.parse(read(path.join(ROOT, 'package.json'))) as { dependencies: Record<string, string> };
    const banned = /(analytics|amplitude|mixpanel|segment|sentry|bugsnag|crashlytics|firebase|appsflyer|adjust|branch|onesignal|admob|google-mobile-ads|facebook|fbsdk|posthog|datadog|instabug|logrocket)/i;
    expect(Object.keys(pkg.dependencies).filter((d) => banned.test(d))).toEqual([]);
  });

  it('le code n\'importe aucun de ces outils', () => {
    const banned = /from ['"][^'"]*(analytics|amplitude|mixpanel|sentry|bugsnag|crashlytics|firebase|appsflyer|onesignal|admob|posthog|datadog)[^'"]*['"]/i;
    expect(sources.filter((f) => banned.test(read(f))).map(rel)).toEqual([]);
  });

  it('seuls le client du professeur et le diagnostic utilisent le réseau', () => {
    const net = sources.filter((f) => /\b(fetch\s*\(|fetchImpl|XMLHttpRequest|new WebSocket|axios)/.test(read(f))).map(rel).sort();
    expect(net).toEqual(['src/api/teacher.ts', 'src/diagnostics/diagnostics.ts', 'src/screens/DiagnosticScreen.tsx']);
  });

  it('le diagnostic n\'interroge que /health et n\'envoie aucune donnée de l\'utilisateur', () => {
    const d = read(path.join(ROOT, 'src/diagnostics/diagnostics.ts'));
    const calls = [...d.matchAll(/fetchImpl\(([^)]*)\)/g)].map((m) => m[1]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/\/health/);
    expect(calls[0]).not.toMatch(/body/);
    expect(d).not.toMatch(/AsyncStorage|loadConversation/);
  });

  it('la clé de l\'IA n\'est jamais dans l\'application', () => {
    for (const f of sources) expect([rel(f), /ANTHROPIC_API_KEY|sk-ant-|x-api-key/i.test(read(f))]).toEqual([rel(f), false]);
  });

  it('la seule adresse externe lue au démarrage est EXPO_PUBLIC_API_URL (serveur de l\'éditeur)', () => {
    const envUses = sources.flatMap((f) => [...read(f).matchAll(/process\.env\.(\w+)/g)].map((m) => m[1]));
    expect([...new Set(envUses)].sort()).toEqual(['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_STREAMING']);
  });

  it('les requêtes vers le professeur ne contiennent que les champs prévus', () => {
    const t = read(path.join(ROOT, 'src/api/teacher.ts'));
    const iface = /interface TeacherRequest \{([\s\S]*?)\n\}/.exec(t)![1];
    const fields = [...iface.matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]).sort();
    expect(fields).toEqual(['ageProfile', 'level', 'messages', 'scenario', 'start', 'targetLang', 'uiLang']);
  });
});
