import { Linking } from 'react-native';

// Ouvre les réglages du téléphone (micro bloqué). Un échec (appareil sans écran de réglages) ne doit jamais faire planter l'app.
export async function openAppSettings(): Promise<void> {
  try { await Linking.openSettings(); } catch { /* rien d'autre à faire: le message explique déjà quoi faire */ }
}
