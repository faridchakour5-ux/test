import AsyncStorage from '@react-native-async-storage/async-storage';

// Lecture/écriture JSON tolérante aux erreurs: l'app doit marcher même si le stockage échoue.
export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T | null;
    return parsed ?? fallback; // « null » enregistré (valeur valide en JSON mais inutilisable) = pas de valeur
  } catch {
    return fallback;
  }
}

export async function save<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignoré volontairement */
  }
}
