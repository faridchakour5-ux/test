// Détection simple de données personnelles dans les messages avant tout envoi au fournisseur d'IA.
// Ce n'est pas exhaustif: c'est un filet de sécurité en plus des règles du prompt.
const PATTERNS = [
  { name: 'email', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { name: 'phone', re: /(?:\+?\d[\s.-]?){9,}\d/g },
  { name: 'address', re: /\b\d{1,4}\s+(?:rue|avenue|av\.?|boulevard|bd|chemin|street|st\.?|road|rd\.?|lane|drive)\b/gi },
  { name: 'url', re: /\bhttps?:\/\/\S+/gi },
];

export function findPii(text) {
  return PATTERNS.filter(({ re }) => { re.lastIndex = 0; return re.test(text); }).map((p) => p.name);
}

export function redactPii(text) {
  return PATTERNS.reduce((acc, { re, name }) => acc.replace(re, `[${name} removed]`), text);
}

// Enfants: on refuse la requête. Autres profils: on masque, la conversation continue.
export function sanitizeMessages(messages, ageProfile) {
  const out = [];
  for (const m of messages) {
    if (m.role !== 'user') { out.push(m); continue; }
    const found = findPii(m.content);
    if (found.length && ageProfile === 'kids') return { error: 'personal information is not allowed' };
    out.push({ role: m.role, content: found.length ? redactPii(m.content) : m.content });
  }
  return { messages: out };
}
