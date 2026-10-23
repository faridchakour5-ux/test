// Progression sans pression: la série ne se « casse » pas, elle se met en pause.
export interface Progress {
  dailyGoalMinutes: 5 | 10 | 20;
  minutesToday: number;
  today: string; // YYYY-MM-DD
  streak: number;
  lastActiveDay: string | null;
  completedLessons: string[];
}

export const initialProgress = (today: string): Progress => ({
  dailyGoalMinutes: 10, minutesToday: 0, today, streak: 0, lastActiveDay: null, completedLessons: [],
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
  return { ...rolled, minutesToday: rolled.minutesToday + minutes, streak, lastActiveDay: today };
}

export const goalReached = (p: Progress) => p.minutesToday >= p.dailyGoalMinutes;

export function completeLesson(p: Progress, id: string): Progress {
  return p.completedLessons.includes(id) ? p : { ...p, completedLessons: [...p.completedLessons, id] };
}
