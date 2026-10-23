import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../api/teacher';
import { load, save } from './storage';

// Les conversations restent UNIQUEMENT sur l'appareil. Elles survivent à une fermeture de l'écran ou de l'app.
export const MAX_SAVED_MESSAGES = 40;
const key = (lessonId: string) => `kalam:conv:v1:${lessonId}`;

export const trimConversation = (messages: ChatMessage[]): ChatMessage[] => messages.slice(-MAX_SAVED_MESSAGES);

function isValid(m: unknown): m is ChatMessage {
  const x = m as ChatMessage;
  return !!x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string' && x.content.length > 0 && x.content.length <= 2000;
}

export async function loadConversation(lessonId: string): Promise<ChatMessage[]> {
  const raw = await load<unknown>(key(lessonId), []);
  return Array.isArray(raw) ? raw.filter(isValid).slice(-MAX_SAVED_MESSAGES) : [];
}

export const saveConversation = (lessonId: string, messages: ChatMessage[]) => save(key(lessonId), trimConversation(messages));

export async function clearConversation(lessonId: string): Promise<void> {
  try { await AsyncStorage.removeItem(key(lessonId)); } catch { /* ignoré */ }
}

// Droit à l'effacement: supprime toutes les données Kalam de l'appareil (état + conversations).
export async function clearAllKalamData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith('kalam:'));
    if (mine.length) await AsyncStorage.removeMany(mine);
  } catch { /* ignoré */ }
}
