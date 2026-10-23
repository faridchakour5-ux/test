import { useEffect } from 'react';
import { UiLang, t } from '../i18n/strings';
import { AgeProfileId } from '../theme/profiles';
import { ReminderSetting, ReminderTexts, syncReminder } from './reminders';

export const reminderTexts = (lang: UiLang): ReminderTexts => ({ title: 'Kalam', body: t(lang, 'reminderNotifBody') });

// Jamais de rappel pour un enfant (ni tant qu'aucun profil n'est choisi).
export const remindersAllowedFor = (profile: AgeProfileId | null) => profile !== null && profile !== 'kids';

// Remet le rappel d'aplomb à chaque lancement et à chaque changement (heure, langue, profil): fuseau horaire,
// redémarrage ou mise à jour du téléphone, autorisation retirée... Ne demande jamais l'autorisation tout seul.
export function useReminderSync(ready: boolean, reminder: ReminderSetting, uiLang: UiLang, profile: AgeProfileId | null) {
  const { enabled, hour, minute } = reminder;
  useEffect(() => {
    if (!ready) return; // avant la lecture de la sauvegarde, on ne touche à rien
    void syncReminder({ enabled, hour, minute }, reminderTexts(uiLang), remindersAllowedFor(profile));
  }, [ready, enabled, hour, minute, uiLang, profile]);
}
