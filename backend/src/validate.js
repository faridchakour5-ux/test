// Validation stricte des requêtes: on ne fait jamais confiance au client.
const PROFILES = ['kids', 'adult', 'senior'];
const LEVELS = ['A1', 'A2', 'B1'];
export const LANGS = ['fr', 'en', 'ar', 'es', 'zh'];
// Langues qu'on peut apprendre. Un ancien client qui n'envoie rien apprend l'anglais.
export const TARGETS = ['en', 'fr'];
export const MAX_MESSAGES = 20;
export const MAX_CHARS = 500;

export function validateChat(body) {
  if (!body || typeof body !== 'object') return { error: 'invalid body' };
  const { ageProfile, level, scenario, uiLang, messages, start } = body;
  const targetLang = body.targetLang === undefined ? 'en' : body.targetLang;
  if (!TARGETS.includes(targetLang)) return { error: 'invalid targetLang' };
  if (!PROFILES.includes(ageProfile)) return { error: 'invalid ageProfile' };
  if (!LEVELS.includes(level)) return { error: 'invalid level' };
  if (uiLang !== undefined && !LANGS.includes(uiLang)) return { error: 'invalid uiLang' };
  if (scenario !== undefined && (typeof scenario !== 'string' || scenario.length > 300)) return { error: 'invalid scenario' };
  if (start !== undefined && typeof start !== 'boolean') return { error: 'invalid start' };
  if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) return { error: 'invalid messages' };
  // `start: true` = le professeur ouvre la conversation: aucun message de l'apprenant n'existe encore.
  if (start === true) {
    if (messages.length !== 0) return { error: 'start requires empty messages' };
    return { value: { ageProfile, level, scenario, uiLang, targetLang, start: true, messages: [] } };
  }
  if (messages.length === 0) return { error: 'invalid messages' };
  for (const m of messages) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > MAX_CHARS) {
      return { error: 'invalid message' };
    }
  }
  if (messages[messages.length - 1].role !== 'user') return { error: 'last message must be from user' };
  return { value: { ageProfile, level, scenario, uiLang, targetLang, messages: messages.map(({ role, content }) => ({ role, content })) } };
}
