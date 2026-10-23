import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cardsForLesson } from '../domain/deck';
import { Level } from '../domain/lessons';
import { Card, review } from '../domain/srs';
import { Consent, DailyLimit, grantMic, noConsent, revokeMic } from '../domain/parental';
import { Progress, XP_PER_REVIEW, localDay, addMinutes, addXp, applyChallenge, completeLesson, initialProgress, noteLessonToday, normalizeProgress } from '../domain/progress';
import { UiLang } from '../i18n/strings';
import { DEFAULT_PALETTE, PaletteId } from '../theme/palettes';
import { AgeProfileId } from '../theme/profiles';
import { clearAllKalamData } from './conversations';
import { load, save } from './storage';

interface Persisted {
  profile: AgeProfileId | null;
  level: Level | null;
  uiLang: UiLang;
  progress: Progress;
  cards: Card[];
  kids: KidsState;
  palette: PaletteId;
}

export interface KidsState {
  stars: number;
  storiesRead: string[];
  consent: Consent;
  dailyLimit: DailyLimit;
}

export const initialKids = (): KidsState => ({ stars: 0, storiesRead: [], consent: noConsent(), dailyLimit: 20 });

export const todayStr = () => localDay();

const initial = (): Persisted => ({ profile: null, level: null, uiLang: 'fr', progress: initialProgress(todayStr()), cards: [], kids: initialKids(), palette: DEFAULT_PALETTE });

interface Ctx extends Persisted {
  ready: boolean;
  setProfile: (p: AgeProfileId) => void;
  setLevel: (l: Level) => void;
  setUiLang: (l: UiLang) => void;
  setGoal: (g: 5 | 10 | 20) => void;
  logSession: (minutes: number, lessonId?: string) => void;
  reviewCard: (key: string, quality: number) => void;
  resetProfile: () => void;
  addStars: (n: number) => void;
  markStoryRead: (id: string) => void;
  setMicConsent: (on: boolean) => void;
  setKidsLimit: (l: DailyLimit) => void;
  eraseAll: () => void;
  setPalette: (p: PaletteId) => void;
}

const AppCtx = createContext<Ctx | null>(null);
const KEY = 'kalam:state:v1';

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    load<Persisted>(KEY, initial()).then((s) => { setState({ ...initial(), ...s, progress: normalizeProgress(s.progress, todayStr()), kids: { ...initialKids(), ...(s.kids ?? {}) } }); setReady(true); });
  }, []);

  const update = useCallback((fn: (s: Persisted) => Persisted) => {
    setState((prev) => { const next = fn(prev); void save(KEY, next); return next; });
  }, []);

  const value: Ctx = {
    ...state,
    ready,
    setProfile: (profile) => update((s) => ({ ...s, profile })),
    setLevel: (level) => update((s) => ({ ...s, level })),
    setUiLang: (uiLang) => update((s) => ({ ...s, uiLang })),
    setGoal: (g) => update((s) => ({ ...s, progress: { ...s.progress, dailyGoalMinutes: g } })),
    logSession: (minutes, lessonId) => update((s) => {
      const today = todayStr();
      let progress = addMinutes(s.progress, minutes, today);
      if (lessonId) progress = noteLessonToday(completeLesson(progress, lessonId), today);
      progress = applyChallenge(progress, today);
      return { ...s, progress, cards: lessonId ? cardsForLesson(lessonId, s.cards, Date.now()) : s.cards };
    }),
    setPalette: (palette) => update((s) => ({ ...s, palette })),
    resetProfile: () => update((s) => ({ ...s, profile: null, level: null })),
    addStars: (n) => update((s) => ({ ...s, kids: { ...s.kids, stars: s.kids.stars + n } })),
    markStoryRead: (id) => update((s) => ({ ...s, kids: { ...s.kids, storiesRead: s.kids.storiesRead.includes(id) ? s.kids.storiesRead : [...s.kids.storiesRead, id] } })),
    setMicConsent: (on) => update((s) => ({ ...s, kids: { ...s.kids, consent: on ? grantMic(s.kids.consent, Date.now()) : revokeMic(s.kids.consent) } })),
    setKidsLimit: (dailyLimit) => update((s) => ({ ...s, kids: { ...s.kids, dailyLimit } })),
    // Droit à l'effacement (RGPD): on remet tout à zéro, y compris le consentement.
    eraseAll: () => { void clearAllKalamData(); setState(initial()); },
    reviewCard: (key, quality) => update((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.key === key ? review(c, quality, Date.now()) : c)),
      progress: addXp(s.progress, XP_PER_REVIEW), // chaque carte révisée compte, même ratée: on récompense l'effort
    })),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider');
  return ctx;
}
