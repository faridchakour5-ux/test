import { cleanup, render, screen } from '@testing-library/react-native';
import React from 'react';
import { CHALLENGE_POOL, ChallengeId, dailyChallenge, initialProgress, lastDays, shiftDay } from '../domain/progress';
import { StringKey, UI_LANGS, t } from '../i18n/strings';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ChallengeCard } from './ChallengeCard';
import { LevelBadge } from './LevelBadge';
import { WeekChart } from './WeekChart';

afterEach(async () => { await cleanup(); });
const wrap = (el: React.ReactElement) => render(<ThemeProvider profileId="adult">{el}</ThemeProvider>);

// Un jour (déterministe) pour chaque défi possible.
const dayFor = (id: ChallengeId) => { for (let i = 0; i < 400; i++) { const d = shiftDay('2026-01-01', i); if (dailyChallenge(d) === id) return d; } throw new Error('introuvable'); };
const TEXT: Record<ChallengeId, StringKey> = { minutes5: 'chMinutes5', minutes10: 'chMinutes10', lesson1: 'chLesson1' };

describe('ChallengeCard', () => {
  it('le pool contient bien les trois défis, et chacun apparaît au fil des jours', () => {
    for (const id of CHALLENGE_POOL) expect(dayFor(id)).toBeTruthy();
  });

  it('défi de minutes en cours: texte avec compteur, barre proportionnelle, rappel sans pression', async () => {
    const day = dayFor('minutes10');
    await wrap(<ChallengeCard lang="fr" today={day} progress={{ ...initialProgress(day), minutesToday: 3 }} />);
    expect(screen.getByText(`${t('fr', 'chMinutes10')} (3/10)`)).toBeTruthy();
    expect(screen.getByTestId('challenge-fill')).toHaveStyle({ width: '30%' });
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: 10, now: 3 });
    expect(screen.getByText(t('fr', 'challengeHint'))).toBeTruthy();
    expect(screen.queryByText(t('fr', 'challengeDone'))).toBeNull();
    expect(screen.getByText(`🎯 ${t('fr', 'challengeTitle')}`)).toBeTruthy();
  });

  it('défi de 5 minutes: 2 minutes = 40 %; 9 minutes plafonnent à 100 %', async () => {
    const day = dayFor('minutes5');
    await wrap(<ChallengeCard lang="fr" today={day} progress={{ ...initialProgress(day), minutesToday: 2 }} />);
    expect(screen.getByText(`${t('fr', 'chMinutes5')} (2/5)`)).toBeTruthy();
    expect(screen.getByTestId('challenge-fill')).toHaveStyle({ width: '40%' });
    await cleanup();
    await wrap(<ChallengeCard lang="fr" today={day} progress={{ ...initialProgress(day), minutesToday: 9 }} />);
    expect(screen.getByTestId('challenge-fill')).toHaveStyle({ width: '100%' });
  });

  it('défi réussi (pile à la cible): coche, plus de compteur, message de réussite', async () => {
    const day = dayFor('minutes5');
    await wrap(<ChallengeCard lang="fr" today={day} progress={{ ...initialProgress(day), minutesToday: 5 }} />);
    expect(screen.getByText(`✓ ${t('fr', 'chMinutes5')}`)).toBeTruthy();
    expect(screen.queryByText(/\(\d+\/5\)/)).toBeNull();
    expect(screen.getByText(t('fr', 'challengeDone'))).toBeTruthy();
    expect(screen.queryByText(t('fr', 'challengeHint'))).toBeNull();
    expect(screen.getByTestId('challenge-fill')).toHaveStyle({ width: '100%' });
  });

  it('défi « une leçon »: 0/1 puis réussi quand une leçon est terminée aujourd\'hui (pas hier)', async () => {
    const day = dayFor('lesson1');
    await wrap(<ChallengeCard lang="fr" today={day} progress={initialProgress(day)} />);
    expect(screen.getByText(`${t('fr', 'chLesson1')} (0/1)`)).toBeTruthy();
    expect(screen.getByTestId('challenge-fill')).toHaveStyle({ width: '0%' });
    await cleanup();
    await wrap(<ChallengeCard lang="fr" today={day} progress={{ ...initialProgress(day), lessonsToday: { day, count: 1 } }} />);
    expect(screen.getByText(`✓ ${t('fr', 'chLesson1')}`)).toBeTruthy();
    await cleanup();
    await wrap(<ChallengeCard lang="fr" today={day} progress={{ ...initialProgress(day), lessonsToday: { day: shiftDay(day, -1), count: 3 } }} />);
    expect(screen.getByText(`${t('fr', 'chLesson1')} (0/1)`)).toBeTruthy();
  });

  it('les minutes d\'hier ne comptent pas pour le défi d\'aujourd\'hui', async () => {
    const day = dayFor('minutes5');
    await wrap(<ChallengeCard lang="fr" today={day} progress={{ ...initialProgress(shiftDay(day, -1)), minutesToday: 8 }} />);
    expect(screen.getByText(`${t('fr', 'chMinutes5')} (0/5)`)).toBeTruthy();
  });

  it.each(UI_LANGS)('le texte du défi existe en %s', async (lang) => {
    for (const id of CHALLENGE_POOL) {
      const day = dayFor(id);
      await wrap(<ChallengeCard lang={lang} today={day} progress={initialProgress(day)} />);
      expect(screen.getByText(new RegExp(t(lang, TEXT[id]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy();
      await cleanup();
    }
  });
});

describe('LevelBadge', () => {
  it('niveau 1 au départ, barre minimale visible (3 %)', async () => {
    await wrap(<LevelBadge lang="fr" xp={0} />);
    expect(screen.getByText(`🏅 ${t('fr', 'level')} 1`)).toBeTruthy();
    expect(screen.getByText(`0 ${t('fr', 'xpPoints')}`)).toBeTruthy();
    expect(screen.getByTestId('level-fill')).toHaveStyle({ width: '3%' });
  });

  it('progression vers le niveau suivant (25 points pour le niveau 2): 10 points = 40 %', async () => {
    await wrap(<LevelBadge lang="fr" xp={10} />);
    expect(screen.getByTestId('level-fill')).toHaveStyle({ width: '40%' });
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityLabel', `${t('fr', 'level')} 1`);
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 40, text: `10 ${t('fr', 'xpPoints')}, 15 → ${t('fr', 'level')} 2` });
  });

  it('franchir le seuil passe au niveau supérieur; la barre repart du bas du nouveau niveau', async () => {
    await wrap(<LevelBadge lang="fr" xp={25} />);
    expect(screen.getByText(`🏅 ${t('fr', 'level')} 2`)).toBeTruthy();
    expect(screen.getByTestId('level-fill')).toHaveStyle({ width: '3%' });
    await cleanup();
    await wrap(<LevelBadge lang="fr" xp={24} />);
    expect(screen.getByText(`🏅 ${t('fr', 'level')} 1`)).toBeTruthy();
    expect(screen.getByTestId('level-fill')).toHaveStyle({ width: '96%' });
  });

  it('points invalides: traités comme zéro (jamais de plantage ni de niveau négatif)', async () => {
    for (const xp of [-5, NaN, Infinity]) {
      await wrap(<LevelBadge lang="fr" xp={xp} />);
      expect(screen.getByText(`🏅 ${t('fr', 'level')} 1`)).toBeTruthy();
      await cleanup();
    }
  });
});

describe('WeekChart: hauteurs et repères', () => {
  const bars = [0, 0, 5, 12, 0, 20, 8].map((minutes, i) => ({ day: `2026-03-${String(6 + i).padStart(2, '0')}`, minutes, isToday: i === 6 }));
  const bar = (n: number) => screen.getByTestId(`bar-${bars[n].day}`);

  it('hauteur proportionnelle au plus grand jour (ou à l\'objectif), trait fin pour un jour sans activité', async () => {
    await wrap(<WeekChart lang="fr" bars={bars} goal={10} lessonsDone={0} />);
    expect(bar(0)).toHaveStyle({ height: 3 });
    expect(bar(2)).toHaveStyle({ height: 18 }); // 5 / 20 × 72
    expect(bar(3)).toHaveStyle({ height: 43 }); // 12 / 20 × 72 = 43,2
    expect(bar(5)).toHaveStyle({ height: 72 }); // le maximum
    expect(bar(6)).toHaveStyle({ height: 29 }); // 8 / 20 × 72 = 28,8
  });

  it('l\'objectif sert d\'échelle quand il est plus grand que tous les jours; une barre non vide fait au moins 6', async () => {
    const small = bars.map((b, i) => ({ ...b, minutes: i === 3 ? 1 : i === 5 ? 30 : 0 }));
    await wrap(<WeekChart lang="fr" bars={small} goal={60} lessonsDone={0} />);
    expect(bar(3)).toHaveStyle({ height: 6 }); // 1 / 60 × 72 ≈ 1 → plancher
    expect(bar(5)).toHaveStyle({ height: 36 }); // 30 / 60 × 72
  });

  it('objectif atteint = trait plein (jamais la couleur seule); sinon barre atténuée', async () => {
    await wrap(<WeekChart lang="fr" bars={bars} goal={10} lessonsDone={0} />);
    expect(bar(3)).toHaveStyle({ borderWidth: 2, opacity: 1 }); // 12 ≥ 10
    expect(bar(5)).toHaveStyle({ borderWidth: 2, opacity: 1 });
    expect(bar(2)).toHaveStyle({ borderWidth: 0, opacity: 0.55 }); // 5 < 10
    expect(bar(6)).toHaveStyle({ borderWidth: 0, opacity: 0.55 });
    expect(bar(0)).toHaveStyle({ borderWidth: 0, opacity: 1 }); // jour vide: pas de barre pleine
  });

  it('pile à l\'objectif compte comme atteint', async () => {
    await wrap(<WeekChart lang="fr" bars={bars.map((b, i) => ({ ...b, minutes: i === 4 ? 10 : 0 }))} goal={10} lessonsDone={0} />);
    expect(bar(4)).toHaveStyle({ borderWidth: 2 });
  });

  it('avec la vraie progression: le jour courant est le dernier, ses minutes sont incluses', async () => {
    const today = '2026-03-10';
    const p = { ...initialProgress(today), minutesToday: 7, history: { [shiftDay(today, -1)]: 4 } };
    const real = lastDays(p, today);
    await wrap(<WeekChart lang="fr" bars={real} goal={10} lessonsDone={2} />);
    expect(screen.getByLabelText(`${t('fr', 'weekChartLabel')}: 11 ${t('fr', 'totalMinutes')}, 2 ${t('fr', 'lessonsDone')}`)).toBeTruthy();
    expect(real).toHaveLength(7);
    expect(real[6]).toMatchObject({ day: today, isToday: true, minutes: 7 });
  });
});
