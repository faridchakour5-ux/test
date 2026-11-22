import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, STORAGE_KEY, defaultData, normalizeData } from './data';

// Chargement et sauvegarde locales. Un échec (stockage plein, donnée abîmée) ne bloque jamais l'application.
export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : defaultData();
  } catch {
    return defaultData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* l'application continue sans sauvegarde */ }
}

export async function clearData(): Promise<void> {
  try { await AsyncStorage.removeItem(STORAGE_KEY); } catch { /* ignoré */ }
}
