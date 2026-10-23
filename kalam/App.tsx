import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { I18nManager } from 'react-native';
import { UiLang, isRtl } from './src/i18n/strings';
import { ProfilePickerScreen } from './src/screens/ProfilePickerScreen';
import { AgeProfileId } from './src/theme/profiles';
import { ThemeProvider } from './src/theme/ThemeProvider';

// Langue d'interface fixe pour l'instant; elle sera choisie dans les réglages (étape suivante).
const UI_LANG: UiLang = 'fr';
I18nManager.allowRTL(true);
I18nManager.forceRTL(isRtl(UI_LANG));

export default function App() {
  const [profile, setProfile] = useState<AgeProfileId>('adult');
  return (
    <ThemeProvider profileId={profile}>
      <ProfilePickerScreen lang={UI_LANG} onPick={setProfile} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
