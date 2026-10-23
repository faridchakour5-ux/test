// Progression sans pression: la série ne se « casse » pas, elle se met en pause.
export interface Progress {
  dailyGoalMinutes: 5 | 10 | 20;
  minutesToday: number;
  today: string; // YYYY-MM-DD
  streak: number;
  lastActiveDay: string | null;
  completedLessons: string[];
  history: Record<string, number>; // minutes par jour (YYYY-MM-DD), 60 derniers jours
  xp: number; // points d'expérience: ne baissent JAMAIS (pas de punition)
}

export const initialProgress = (today: string): Progress => ({
  dailyGoalMinutes: 10, minutesToday: 0, today, streak: 0, lastActiveDay: null, completedLessons: [], history: {}, xp: 0,
});

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function rollDay(p: Progress, today: string): Progress {
  return p.today === today ? p : { ...p, today, minutesToday: 0 };
}

export function addMinutes(p: Progress, minutes: number, today: string): Progress {
  const rolled = rollDay(p, today);
  const first = rolled.minutesToday === 0 && rolled.lastActiveDay !== today;
  let streak = rolled.streak;
  if (first) streak = rolled.lastActiveDay && dayDiff(rolled.lastActiveDay, today) === 1 ? streak + 1 : 1;
  const history = pruneHistory({ ...(rolled.history ?? {}), [today]: (rolled.history?.[today] ?? 0) + minutes }, today);
  return { ...rolled, minutesToday: rolled.minutesToday + minutes, streak, lastActiveDay: today, history, xp: (rolled.xp ?? 0) + Math.max(0, minutes) * XP_PER_MINUTE };
}

export const HISTORY_DAYS = 60;

// Jour précédent (ou suivant) au format YYYY-MM-DD, en UTC pour éviter les décalages d'heure d'été.
export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function pruneHistory(h: Record<string, number>, today: string): Record<string, number> {
  const oldest = shiftDay(today, -(HISTORY_DAYS - 1));
  return Object.fromEntries(Object.entries(h).filter(([day]) => day >= oldest && day <= today));
}

export interface DayBar { day: string; minutes: number; isToday: boolean }

// Les `n` derniers jours (du plus ancien au plus récent) avec les minutes de chacun.
export function lastDays(p: Progress, today: string, n = 7): DayBar[] {
  return Array.from({ length: n }, (_, i) => {
    const day = shiftDay(today, i - (n - 1));
    return { day, minutes: day === today ? Math.max(p.minutesToday, p.history?.[day] ?? 0) : p.history?.[day] ?? 0, isToday: day === today };
  });
}

export const totalMinutes = (bars: DayBar[]) => bars.reduce((sum, b) => sum + b.minutes, 0);

// Remet d'aplomb une progression sauvegardée: ancienne version (sans historique) ou données abîmées.
export function normalizeProgress(raw: Partial<Progress> | null | undefined, today: string): Progress {
  const base = initialProgress(today);
  if (!raw || typeof raw !== 'object') return base;
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
  const goals = [5, 10, 20];
  const history: Record<string, number> = {};
  if (raw.history && typeof raw.history === 'object') {
    for (const [day, m] of Object.entries(raw.history)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof m === 'number' && Number.isFinite(m) && m >= 0 && m < 1440) history[day] = m;
    }
  }
  return {
    dailyGoalMinutes: (goals.includes(raw.dailyGoalMinutes as number) ? raw.dailyGoalMinutes : base.dailyGoalMinutes) as Progress['dailyGoalMinutes'],
    minutesToday: num(raw.minutesToday, 0),
    today: typeof raw.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.today) ? raw.today : today,
    streak: num(raw.streak, 0),
    lastActiveDay: typeof raw.lastActiveDay === 'string' ? raw.lastActiveDay : null,
    completedLessons: Array.isArray(raw.completedLessons) ? raw.completedLessons.filter((x): x is string => typeof x === 'string') : [],
    history: pruneHistory(history, today),
    xp: Math.floor(num(raw.xp, 0)),
  };
}

export const goalReached = (p: Progress) => p.minutesToday >= p.dailyGoalMinutes;

export const XP_PER_MINUTE = 1;
export const XP_PER_NEW_LESSON = 10;
export const XP_PER_REVIEW = 1;

export function completeLesson(p: Progress, id: string): Progress {
  // Les points ne sont donnés qu'à la première réussite d'une leçon (pas de farm en la refaisant).
  return p.completedLessons.includes(id) ? p : { ...p, completedLessons: [...p.completedLessons, id], xp: (p.xp ?? 0) + XP_PER_NEW_LESSON };
}

export const addXp = (p: Progress, amount: number): Progress => ({ ...p, xp: (p.xp ?? 0) + Math.max(0, Math.floor(amount)) });

// Niveau n demande 25 * (n-1)^2 points: rapide au début (encourageant), plus long ensuite.
export const xpForLevel = (level: number) => 25 * (level - 1) * (level - 1);

export interface LevelInfo { level: number; xp: number; levelStart: number; nextAt: number; fraction: number }

export function levelFromXp(xpRaw: number): LevelInfo {
  const xp = Number.isFinite(xpRaw) && xpRaw > 0 ? Math.floor(xpRaw) : 0;
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const levelStart = xpForLevel(level);
  const nextAt = xpForLevel(level + 1);
  return { level, xp, levelStart, nextAt, fraction: (xp - levelStart) / (nextAt - levelStart) };
}
