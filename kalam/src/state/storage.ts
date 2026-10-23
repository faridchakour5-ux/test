import AsyncStorage from '@react-native-async-storage/async-storage';

// Lecture/écriture JSON tolérante aux erreurs: l'app doit marcher même si le stockage échoue.
export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
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
