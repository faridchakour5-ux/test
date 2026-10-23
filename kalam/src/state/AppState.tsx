import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cardsForLesson } from '../domain/deck';
import { Level } from '../domain/lessons';
import { Card, review } from '../domain/srs';
import { Progress, addMinutes, completeLesson, initialProgress } from '../domain/progress';
import { UiLang } from '../i18n/strings';
import { AgeProfileId } from '../theme/profiles';
import { load, save } from './storage';

interface Persisted {
  profile: AgeProfileId | null;
  level: Level | null;
  uiLang: UiLang;
  progress: Progress;
  cards: Card[];
}

export const todayStr = () => new Date().toISOString().slice(0, 10);

const initial = (): Persisted => ({ profile: null, level: null, uiLang: 'fr', progress: initialProgress(todayStr()), cards: [] });

interface Ctx extends Persisted {
  ready: boolean;
  setProfile: (p: AgeProfileId) => void;
  setLevel: (l: Level) => void;
  setUiLang: (l: UiLang) => void;
  setGoal: (g: 5 | 10 | 20) => void;
  logSession: (minutes: number, lessonId?: string) => void;
  reviewCard: (key: string, quality: number) => void;
}

const AppCtx = createContext<Ctx | null>(null);
const KEY = 'kalam:state:v1';

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    load<Persisted>(KEY, initial()).then((s) => { setState({ ...initial(), ...s }); setReady(true); });
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
      let progress = addMinutes(s.progress, minutes, todayStr());
      if (lessonId) progress = completeLesson(progress, lessonId);
      return { ...s, progress, cards: lessonId ? cardsForLesson(lessonId, s.cards, Date.now()) : s.cards };
    }),
    reviewCard: (key, quality) => update((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.key === key ? review(c, quality, Date.now()) : c)),
    })),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider');
  return ctx;
}
