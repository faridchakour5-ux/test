import { AgeProfileId } from '../theme/profiles';
import { Level } from '../domain/lessons';
import { UiLang } from '../i18n/strings';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// URL du backend (jamais de clé API ici). Définie via EXPO_PUBLIC_API_URL.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

export interface TeacherRequest {
  ageProfile: AgeProfileId;
  level: Level;
  scenario: string;
  uiLang: UiLang;
  messages: ChatMessage[];
}

export async function askTeacher(req: TeacherRequest, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`teacher error ${res.status}`);
  const data = (await res.json()) as { reply?: string };
  if (!data.reply) throw new Error('empty reply');
  return data.reply;
}
