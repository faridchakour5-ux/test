import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { initialKids } from '../state/AppState';
import { initialProgress } from '../domain/progress';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AgeProfileId } from '../theme/profiles';
import { UI_LANGS, UiLang } from '../i18n/strings';
import { HomeScreen } from './HomeScreen';
import { KidsHomeScreen } from './KidsHomeScreen';
import { LevelTestScreen } from './LevelTestScreen';
import { ProfilePickerScreen } from './ProfilePickerScreen';
import { StickersScreen } from './StickersScreen';
import { DuoSetupScreen } from './DuoSetupScreen';
import { ReviewScreen } from './ReviewScreen';
import { newCard } from '../domain/srs';

const noop = () => {};

const screens = (lang: UiLang): Record<string, React.ReactElement> => ({
  profilePicker: <ProfilePickerScreen lang={lang} onPick={noop} onLang={noop} />,
  levelTest: <LevelTestScreen lang={lang} onDone={noop} />,
  home: <HomeScreen lang={lang} level="A1" progress={initialProgress('2026-01-01')} onOpenLesson={noop} onGoal={noop} dueCount={2} onReview={noop}
    onSwitchProfile={noop} palette="violet" onPalette={noop} onLang={noop} onErase={noop} onExport={async () => '{}'} onDuo={noop} today="2026-01-01" />,
  kidsHome: <KidsHomeScreen lang={lang} stars={5} minutesToday={0} dailyLimit={20} onStories={noop} onPlay={noop} onStickers={noop} onParents={noop} />,
  stickers: <StickersScreen lang={lang} stars={9} onBack={noop} />,
  duoSetup: <DuoSetupScreen lang={lang} onStart={noop} onBack={noop} />,
  review: <ReviewScreen lang={lang} session={[newCard('restaurant:0', 0)]} onAnswer={noop} onExit={noop} />,
});

const profiles: AgeProfileId[] = ['kids', 'adult', 'senior'];

describe('accessibilité: chaque bouton a un nom lisible, dans toutes les langues et tous les profils', () => {
  for (const lang of UI_LANGS) {
    for (const profile of profiles) {
      for (const [name, element] of Object.entries(screens(lang))) {
        it(`${name} / ${lang} / ${profile}`, async () => {
          await render(<ThemeProvider profileId={profile}>{element}</ThemeProvider>);
          const buttons = screen.queryAllByRole('button');
          expect(buttons.length).toBeGreaterThan(0);
          for (const b of buttons) expect(b).toHaveAccessibleName();
          // les titres principaux sont déclarés comme tels (navigation par titres)
          expect(screen.queryAllByRole('header').length).toBeGreaterThan(0);
        });
      }
    }
  }
});

describe('zones tactiles', () => {
  it('le profil enfant utilise de grandes zones tactiles, le senior aussi', () => {
    const { AGE_PROFILES } = jest.requireActual('../theme/profiles');
    expect(AGE_PROFILES.kids.minTouchSize).toBeGreaterThanOrEqual(64);
    expect(AGE_PROFILES.senior.minTouchSize).toBeGreaterThanOrEqual(64);
    expect(AGE_PROFILES.adult.minTouchSize).toBeGreaterThanOrEqual(44);
  });
  it('l\'état initial enfant ne donne aucun accès au micro', () => {
    expect(initialKids().consent.micAllowed).toBe(false);
  });
});
