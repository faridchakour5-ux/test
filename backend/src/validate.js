// Validation stricte des requêtes: on ne fait jamais confiance au client.
const PROFILES = ['kids', 'adult', 'senior'];
const LEVELS = ['A1', 'A2', 'B1'];
const LANGS = ['fr', 'en', 'ar'];
export const MAX_MESSAGES = 20;
export const MAX_CHARS = 500;

export function validateChat(body) {
  if (!body || typeof body !== 'object') return { error: 'invalid body' };
  const { ageProfile, level, scenario, uiLang, messages } = body;
  if (!PROFILES.includes(ageProfile)) return { error: 'invalid ageProfile' };
  if (!LEVELS.includes(level)) return { error: 'invalid level' };
  if (uiLang !== undefined && !LANGS.includes(uiLang)) return { error: 'invalid uiLang' };
  if (scenario !== undefined && (typeof scenario !== 'string' || scenario.length > 300)) return { error: 'invalid scenario' };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return { error: 'invalid messages' };
  for (const m of messages) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > MAX_CHARS) {
      return { error: 'invalid message' };
    }
  }
  if (messages[messages.length - 1].role !== 'user') return { error: 'last message must be from user' };
  return { value: { ageProfile, level, scenario, uiLang, messages: messages.map(({ role, content }) => ({ role, content })) } };
}
