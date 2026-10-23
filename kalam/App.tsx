import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, View } from 'react-native';
import { buildReviewSession } from './src/domain/deck';
import { LESSONS, getLesson } from './src/domain/lessons';
import { Card } from './src/domain/srs';
import { timeIsUp } from './src/domain/parental';
import { localDay } from './src/domain/progress';
import { isRtl } from './src/i18n/strings';
import { ChatScreen } from './src/screens/ChatScreen';
import { DuoSetupScreen } from './src/screens/DuoSetupScreen';
import { DUO_LESSON_ID, duoLesson } from './src/domain/duo';
import { FreeTopic } from './src/domain/freeTopics';
import { clearConversation } from './src/state/conversations';
import { HomeScreen } from './src/screens/HomeScreen';
import { KidsHomeScreen } from './src/screens/KidsHomeScreen';
import { LevelTestScreen } from './src/screens/LevelTestScreen';
import { ParentsScreen } from './src/screens/ParentsScreen';
import { PlayScreen } from './src/screens/PlayScreen';
import { ProfilePickerScreen } from './src/screens/ProfilePickerScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { StickersScreen } from './src/screens/StickersScreen';
import { StoryScreen } from './src/screens/StoryScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AppStateProvider, useApp } from './src/state/AppState';
import { AgeProfileId } from './src/theme/profiles';
import { ThemeProvider } from './src/theme/ThemeProvider';

type Route =
  | { name: 'home' }
  | { name: 'lesson'; id: string }
  | { name: 'review'; session: Card[] }
  | { name: 'duo-setup' }
  | { name: 'duo'; names: [string, string]; topic: FreeTopic | null }
  | { name: 'story' }
  | { name: 'play' }
  | { name: 'stickers' }
  | { name: 'parents' };

function Root() {
  const app = useApp();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  // `now` n'est lu qu'à la création et à chaque retour à l'accueil (jamais pendant un rendu).
  const [now, setNow] = useState(() => Date.now());
  const home = () => { setNow(Date.now()); setRoute({ name: 'home' }); };

  useEffect(() => {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(isRtl(app.uiLang));
  }, [app.uiLang]);

  if (!app.ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;

  const pickProfile = (p: AgeProfileId) => {
    app.setProfile(p);
    // Le mode enfant n'a pas de test de niveau: tout est guidé.
    if (p === 'kids') app.setLevel('A1');
    home();
  };

  const timeUp = timeIsUp(app.kids.dailyLimit, app.progress.minutesToday);

  let screen: React.ReactNode;
  if (!app.profile) {
    screen = <ProfilePickerScreen lang={app.uiLang} onPick={pickProfile} onLang={app.setUiLang} />;
  } else if (!app.level) {
    screen = <LevelTestScreen lang={app.uiLang} onDone={app.setLevel} />;
  } else if (app.profile === 'kids') {
    // Mode enfant: aucune route vers le chat libre avec l'IA ni vers les leçons adultes.
    if (route.name === 'story' && !timeUp) {
      screen = <StoryScreen lang={app.uiLang}
        onExit={(m) => { if (m > 0) app.logSession(m); home(); }}
        onFinish={(id, m) => { app.markStoryRead(id); app.addStars(2); app.logSession(m); home(); }} />;
    } else if (route.name === 'play' && !timeUp) {
      screen = <PlayScreen lang={app.uiLang} stars={app.kids.stars} micAllowed={app.kids.consent.micAllowed}
        onCorrect={() => app.addStars(1)} onExit={(m) => { if (m > 0) app.logSession(m); home(); }} />;
    } else if (route.name === 'stickers') {
      screen = <StickersScreen lang={app.uiLang} stars={app.kids.stars} onBack={home} />;
    } else if (route.name === 'parents') {
      screen = <ParentsScreen lang={app.uiLang} kids={app.kids} minutesToday={app.progress.minutesToday}
        onMic={app.setMicConsent} onLimit={app.setKidsLimit}
        onSwitchProfile={() => { app.resetProfile(); home(); }} onErase={() => { app.eraseAll(); home(); }} onBack={home} palette={app.palette} onPalette={app.setPalette} onLang={app.setUiLang} onExport={app.exportData} />;
    } else {
      screen = <KidsHomeScreen lang={app.uiLang} stars={app.kids.stars} minutesToday={app.progress.minutesToday} dailyLimit={app.kids.dailyLimit}
        onStories={() => setRoute({ name: 'story' })} onPlay={() => setRoute({ name: 'play' })}
        onStickers={() => setRoute({ name: 'stickers' })} onParents={() => setRoute({ name: 'parents' })} />;
    }
  } else if (route.name === 'duo-setup') {
    screen = <DuoSetupScreen lang={app.uiLang} onBack={home}
      onStart={(names, topic) => { void clearConversation(DUO_LESSON_ID).then(() => setRoute({ name: 'duo', names, topic })); }} />;
  } else if (route.name === 'duo') {
    // Conversation à deux: deux personnes, le professeur anime. Jamais disponible en mode enfant (branche ci-dessus).
    screen = <ChatScreen duo={{ names: route.names }} lang={app.uiLang} lesson={duoLesson(route.names[0], route.names[1], route.topic)} level={app.level} ageProfile={app.profile}
      onBack={home} onFinish={(m) => { app.logSession(m); home(); }} />;
  } else if (route.name === 'review') {
    screen = <ReviewScreen lang={app.uiLang} session={route.session} onAnswer={app.reviewCard} onExit={home} />;
  } else if (route.name === 'lesson' && getLesson(route.id)) {
    screen = <ChatScreen lang={app.uiLang} lesson={getLesson(route.id) ?? LESSONS[0]} level={app.level} ageProfile={app.profile}
      onBack={home} onFinish={(m) => { app.logSession(m, route.id); home(); }} />;
  } else {
    screen = <HomeScreen lang={app.uiLang} level={app.level} progress={app.progress}
      onOpenLesson={(id) => setRoute({ name: 'lesson', id })} onGoal={app.setGoal}
      dueCount={buildReviewSession(app.cards, now, 999).length}
      onReview={() => setRoute({ name: 'review', session: buildReviewSession(app.cards, now) })}
      onSwitchProfile={() => { app.resetProfile(); home(); }} palette={app.palette} onPalette={app.setPalette}
      onLang={app.setUiLang} onErase={() => { app.eraseAll(); home(); }} onExport={app.exportData} onDuo={() => setRoute({ name: 'duo-setup' })} today={localDay(new Date(now))} />;
  }

  return (
    <ThemeProvider profileId={app.profile ?? 'adult'} paletteId={app.palette}>
      {screen}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppStateProvider>
        <Root />
      </AppStateProvider>
    </ErrorBoundary>
  );
}
