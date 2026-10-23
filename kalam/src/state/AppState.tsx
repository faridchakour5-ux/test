import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cardsForLesson } from '../domain/deck';
import { Level } from '../domain/lessons';
import { DEFAULT_TARGET, TARGET_LANGS, TargetLang, isTargetLang, lessonKey } from '../domain/targets';
import { Card, review } from '../domain/srs';
import { Consent, DailyLimit, grantMic, noConsent, revokeMic } from '../domain/parental';
import { Progress, XP_PER_REVIEW, localDay, addMinutes, addXp, applyChallenge, completeLesson, initialProgress, noteLessonToday, normalizeProgress } from '../domain/progress';
import { UiLang } from '../i18n/strings';
import { DEFAULT_PALETTE, PaletteId } from '../theme/palettes';
import { AgeProfileId } from '../theme/profiles';
import { clearAllKalamData, loadAllConversations } from './conversations';
import { buildExport } from './exportData';
import { load, save } from './storage';

interface Persisted {
  profile: AgeProfileId | null;
  targetLang: TargetLang; // langue apprise
  levels: Partial<Record<TargetLang, Level>>; // un niveau PAR langue apprise
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

const LEVELS: Level[] = ['A1', 'A2', 'B1'];

// Remet d'aplomb une sauvegarde: ancienne version (niveau unique = anglais), valeurs inconnues ou abîmées.
export function migrate(saved: Partial<Persisted> & { level?: Level | null }): Persisted {
  const base = initial();
  const levels: Partial<Record<TargetLang, Level>> = {};
  if (saved.levels && typeof saved.levels === 'object') {
    for (const t of TARGET_LANGS) { const l = saved.levels[t]; if (l && LEVELS.includes(l)) levels[t] = l; }
  }
  if (saved.level && LEVELS.includes(saved.level) && !levels.en) levels.en = saved.level; // ancienne version: un seul niveau, l'anglais
  return {
    ...base,
    ...saved,
    targetLang: isTargetLang(saved.targetLang) ? saved.targetLang : DEFAULT_TARGET,
    levels,
    progress: normalizeProgress(saved.progress, todayStr()),
    kids: { ...initialKids(), ...(saved.kids ?? {}) },
  };
}

const initial = (): Persisted => ({ profile: null, targetLang: DEFAULT_TARGET, levels: {}, uiLang: 'fr', progress: initialProgress(todayStr()), cards: [], kids: initialKids(), palette: DEFAULT_PALETTE });

interface Ctx extends Persisted {
  ready: boolean;
  level: Level | null; // niveau dans la langue apprise courante
  setTargetLang: (t: TargetLang) => void;
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
  exportData: () => Promise<string>;
  setPalette: (p: PaletteId) => void;
}

const AppCtx = createContext<Ctx | null>(null);
const KEY = 'kalam:state:v1';

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    load<Persisted & { level?: Level | null }>(KEY, initial()).then((s) => { setState(migrate(s)); setReady(true); });
  }, []);

  const update = useCallback((fn: (s: Persisted) => Persisted) => {
    setState((prev) => { const next = fn(prev); void save(KEY, next); return next; });
  }, []);

  const value: Ctx = {
    ...state,
    ready,
    setProfile: (profile) => update((s) => ({ ...s, profile })),
    level: state.levels[state.targetLang] ?? null,
    setLevel: (level) => update((s) => ({ ...s, levels: { ...s.levels, [s.targetLang]: level } })),
    setTargetLang: (targetLang) => update((s) => ({ ...s, targetLang })),
    setUiLang: (uiLang) => update((s) => ({ ...s, uiLang })),
    setGoal: (g) => update((s) => ({ ...s, progress: { ...s.progress, dailyGoalMinutes: g } })),
    logSession: (minutes, lessonId) => update((s) => {
      const today = todayStr();
      let progress = addMinutes(s.progress, minutes, today);
      if (lessonId) progress = noteLessonToday(completeLesson(progress, lessonKey(lessonId, s.targetLang)), today);
      progress = applyChallenge(progress, today);
      return { ...s, progress, cards: lessonId ? cardsForLesson(lessonId, s.cards, Date.now(), s.targetLang) : s.cards };
    }),
    setPalette: (palette) => update((s) => ({ ...s, palette })),
    resetProfile: () => update((s) => ({ ...s, profile: null, levels: {} })),
    addStars: (n) => update((s) => ({ ...s, kids: { ...s.kids, stars: s.kids.stars + n } })),
    markStoryRead: (id) => update((s) => ({ ...s, kids: { ...s.kids, storiesRead: s.kids.storiesRead.includes(id) ? s.kids.storiesRead : [...s.kids.storiesRead, id] } })),
    setMicConsent: (on) => update((s) => ({ ...s, kids: { ...s.kids, consent: on ? grantMic(s.kids.consent, Date.now()) : revokeMic(s.kids.consent) } })),
    setKidsLimit: (dailyLimit) => update((s) => ({ ...s, kids: { ...s.kids, dailyLimit } })),
    // Droit à l'effacement (RGPD): on remet tout à zéro, y compris le consentement.
    eraseAll: () => { void clearAllKalamData(); setState(initial()); },
    // Droit à la portabilité (RGPD): renvoie toutes les données de l'appareil en JSON lisible.
    exportData: async () => buildExport(state, await loadAllConversations()),
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
