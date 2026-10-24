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
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StoryScreen } from './src/screens/StoryScreen';
import { DiagnosticScreen } from './src/screens/DiagnosticScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ReminderResult, ReminderSetting, defaultReminder, disableReminder, enableReminder, remindersAvailable, timeLabel } from './src/notifications/reminders';
import { useHardwareBack } from './src/navigation/useHardwareBack';
import { reminderTexts, useReminderSync } from './src/notifications/useReminderSync';
import { AppStateProvider, useApp } from './src/state/AppState';
import { AgeProfileId } from './src/theme/profiles';
import { ThemeProvider } from './src/theme/ThemeProvider';

type Route =
  | { name: 'home' }
  | { name: 'lesson'; id: string }
  | { name: 'review'; session: Card[] }
  | { name: 'settings' }
  | { name: 'diagnostic' }
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

  useReminderSync(app.ready, app.reminder, app.uiLang, app.profile);
  // Test de niveau: le retour d'Android revient au choix du profil (on s'est peut-être trompé), sans effacer ni niveau ni langue.
  useHardwareBack(() => app.resetProfile(), app.ready && app.profile !== null && app.profile !== 'kids' && !app.level);

  if (!app.ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;

  // Rappel quotidien: l'autorisation n'est demandée qu'ici, quand la personne active le rappel.
  const changeReminder = async (next: ReminderSetting): Promise<ReminderResult> => {
    if (next.enabled) {
      const r = await enableReminder(next, reminderTexts(app.uiLang));
      if (!r.ok) return r;
    } else {
      await disableReminder();
    }
    app.setReminder(next);
    return { ok: true };
  };

  // Une seule proposition, après la première leçon terminée, jamais en profil enfant, seulement si les rappels existent ici.
  const offerReminder = !app.reminder.enabled && !app.reminderAsked && app.progress.completedLessons.length >= 1 && remindersAvailable();

  const pickProfile = (p: AgeProfileId) => {
    // Choisir un profil ne change que le profil. Le mode enfant n'a pas besoin de niveau ni de langue apprise
    // (tout est guidé, en anglais): on n'écrase donc jamais ceux d'un adulte qui prête son téléphone.
    app.setProfile(p);
    home();
  };

  const timeUp = timeIsUp(app.kids.dailyLimit, app.progress.minutesToday);

  let screen: React.ReactNode;
  if (!app.profile) {
    screen = <ProfilePickerScreen lang={app.uiLang} onPick={pickProfile} onLang={app.setUiLang} target={app.targetLang} onTarget={app.setTargetLang} />;
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
  } else if (!app.level) {
    screen = <LevelTestScreen lang={app.uiLang} target={app.targetLang} onDone={app.setLevel} />;
  } else if (route.name === 'settings') {
    screen = <SettingsScreen lang={app.uiLang} dailyGoal={app.progress.dailyGoalMinutes} onGoal={app.setGoal}
      palette={app.palette} onPalette={app.setPalette} onLang={app.setUiLang}
      onSwitchProfile={() => { app.resetProfile(); home(); }} onExport={app.exportData}
      onErase={() => { app.eraseAll(); home(); }} onBack={home} reminder={app.reminder} reminderAvailable={remindersAvailable()} onReminder={changeReminder} onDiagnostic={() => setRoute({ name: 'diagnostic' })} />;
  } else if (route.name === 'diagnostic') {
    screen = <DiagnosticScreen lang={app.uiLang} onBack={() => setRoute({ name: 'settings' })} />;
  } else if (route.name === 'duo-setup') {
    screen = <DuoSetupScreen lang={app.uiLang} onBack={home}
      onStart={(names, topic) => { void clearConversation(DUO_LESSON_ID).then(() => setRoute({ name: 'duo', names, topic })); }} />;
  } else if (route.name === 'duo') {
    // Conversation à deux: deux personnes, le professeur anime. Jamais disponible en mode enfant (branche ci-dessus).
    screen = <ChatScreen duo={{ names: route.names }} target={app.targetLang} lang={app.uiLang} lesson={duoLesson(route.names[0], route.names[1], route.topic)} level={app.level} ageProfile={app.profile}
      onBack={home} onFinish={(m) => { app.logSession(m); home(); }} />;
  } else if (route.name === 'review') {
    screen = <ReviewScreen target={app.targetLang} lang={app.uiLang} session={route.session} onAnswer={app.reviewCard} onExit={home} />;
  } else if (route.name === 'lesson' && getLesson(route.id)) {
    screen = <ChatScreen target={app.targetLang} lang={app.uiLang} lesson={getLesson(route.id) ?? LESSONS[0]} level={app.level} ageProfile={app.profile}
      onBack={home} onFinish={(m) => { app.logSession(m, route.id); home(); }} />;
  } else {
    screen = <HomeScreen lang={app.uiLang} level={app.level} progress={app.progress}
      onOpenLesson={(id) => setRoute({ name: 'lesson', id })}
      dueCount={buildReviewSession(app.cards, now, 999, app.targetLang).length}
      onReview={() => setRoute({ name: 'review', session: buildReviewSession(app.cards, now, 10, app.targetLang) })}
      onDuo={() => setRoute({ name: 'duo-setup' })} onSettings={() => setRoute({ name: 'settings' })}
      target={app.targetLang} onTarget={app.setTargetLang} today={localDay(new Date(now))}
      reminderOffer={offerReminder ? {
        time: timeLabel(defaultReminder().hour, defaultReminder().minute),
        onAccept: () => { app.markReminderAsked(); void changeReminder({ ...defaultReminder(), enabled: true }); },
        onLater: app.markReminderAsked,
      } : undefined} />;
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
