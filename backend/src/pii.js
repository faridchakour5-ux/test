// Détection simple de données personnelles dans les messages avant tout envoi au fournisseur d'IA.
// Ce n'est pas exhaustif: c'est un filet de sécurité en plus des règles du prompt.
// « 1 2 3 4 5 6 7 8 9 10 » (exercice de chiffres) n'est pas un numéro de téléphone: suite d'entiers qui se suivent de 1 en 1.
function isCountingRun(match) {
  const nums = match.split(/[\s.-]+/).filter(Boolean).map((t) => Number(t.replace(/^\+/, '')));
  return nums.length >= 4 && nums.every((n, i) => Number.isInteger(n) && (i === 0 || n === nums[i - 1] + 1 || n === nums[i - 1] - 1));
}

const PATTERNS = [
  { name: 'email', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { name: 'phone', re: /(?:\+?\d[\s.-]?){9,}\d/g, skip: isCountingRun },
  // Adresses françaises (rue, avenue…): insensible à la casse.
  { name: 'address', re: /\b\d{1,4}\s+(?:rue|avenue|av\.?|boulevard|bd|chemin)(?![A-Za-z])/gi },
  // Adresses anglaises: un numéro, 1 à 2 noms PROPRES (majuscule) puis un type de voie. « 5 minutes drive » n'en est pas une.
  { name: 'address', re: /\b\d{1,4}[A-Za-z]?\s+(?:[A-Z][A-Za-z'’-]*\s+){1,2}(?:[Ss]treet|[Ss]t\.?|[Rr]oad|[Rr]d\.?|[Ll]ane|[Dd]rive|[Aa]venue|[Aa]ve\.?|[Bb]oulevard|[Bb]lvd\.?)(?![A-Za-z])/g },
  { name: 'url', re: /\bhttps?:\/\/\S+/gi },
];

function hits(text, re, skip) {
  re.lastIndex = 0;
  const found = [...text.matchAll(re)].map((m) => m[0]);
  return skip ? found.filter((m) => !skip(m)) : found;
}

export function findPii(text) {
  return [...new Set(PATTERNS.filter(({ re, skip }) => hits(text, re, skip).length > 0).map((p) => p.name))];
}

export function redactPii(text) {
  return PATTERNS.reduce((acc, { re, name, skip }) => acc.replace(re, (m) => (skip && skip(m) ? m : `[${name} removed]`)), text);
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
