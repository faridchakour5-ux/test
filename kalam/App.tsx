import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, View } from 'react-native';
import { LESSONS, getLesson } from './src/domain/lessons';
import { isRtl } from './src/i18n/strings';
import { ChatScreen } from './src/screens/ChatScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LevelTestScreen } from './src/screens/LevelTestScreen';
import { ProfilePickerScreen } from './src/screens/ProfilePickerScreen';
import { AppStateProvider, useApp } from './src/state/AppState';
import { ThemeProvider } from './src/theme/ThemeProvider';

function Root() {
  const app = useApp();
  const [lessonId, setLessonId] = useState<string | null>(null);

  useEffect(() => {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(isRtl(app.uiLang));
  }, [app.uiLang]);

  if (!app.ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;

  return (
    <ThemeProvider profileId={app.profile ?? 'adult'}>
      {!app.profile ? (
        <ProfilePickerScreen lang={app.uiLang} onPick={app.setProfile} />
      ) : !app.level ? (
        <LevelTestScreen lang={app.uiLang} onDone={app.setLevel} />
      ) : lessonId && getLesson(lessonId) ? (
        <ChatScreen
          lang={app.uiLang}
          lesson={getLesson(lessonId) ?? LESSONS[0]}
          level={app.level}
          ageProfile={app.profile}
          onBack={() => setLessonId(null)}
          onFinish={(m) => { app.logSession(m, lessonId); setLessonId(null); }}
        />
      ) : (
        <HomeScreen lang={app.uiLang} level={app.level} progress={app.progress} onOpenLesson={setLessonId} onGoal={app.setGoal} />
      )}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <Root />
    </AppStateProvider>
  );
}
