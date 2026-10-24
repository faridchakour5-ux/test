import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { LESSONS, recommendLessons } from '../domain/lessons';
import { initialProgress } from '../domain/progress';
import { lessonKey } from '../domain/targets';
import { t } from '../i18n/strings';
import { ThemeProvider } from '../theme/ThemeProvider';
import { HomeScreen } from './HomeScreen';

const P = (over = {}) => ({ ...initialProgress('2026-03-10'), ...over });
const show = (progress = P(), over: Partial<React.ComponentProps<typeof HomeScreen>> = {}, profileId: 'adult' | 'kids' | 'senior' = 'adult') => render(
  <ThemeProvider profileId={profileId}>
    <HomeScreen lang="fr" level="A1" progress={progress} onOpenLesson={jest.fn()} dueCount={0} onReview={jest.fn()} onDuo={jest.fn()}
      onSettings={jest.fn()} onTarget={jest.fn()} today="2026-03-10" {...over} />
  </ThemeProvider>,
);
afterEach(async () => { await cleanup(); });

describe('accueil: détails de la progression', () => {
  it('niveau affiché dans le titre et objectif du jour', async () => {
    await show(P({ minutesToday: 4, dailyGoalMinutes: 10 }), { level: 'A2' });
    expect(screen.getByRole('header', { name: 'Kalam · A2' })).toBeTruthy();
    expect(screen.getByText(`${t('fr', 'goal')}: 4/10 ${t('fr', 'minutes')}`)).toBeTruthy();
    expect(screen.queryByText(t('fr', 'goalReached'))).toBeNull();
  });

  it('objectif atteint: félicitation (à l\'objectif pile, et au-delà)', async () => {
    await show(P({ minutesToday: 10, dailyGoalMinutes: 10 }));
    expect(screen.getByText(t('fr', 'goalReached'))).toBeTruthy();
    await cleanup();
    await show(P({ minutesToday: 25, dailyGoalMinutes: 10 }));
    expect(screen.getByText(t('fr', 'goalReached'))).toBeTruthy();
    await cleanup();
    await show(P({ minutesToday: 9, dailyGoalMinutes: 10 }));
    expect(screen.queryByText(t('fr', 'goalReached'))).toBeNull();
  });

  it('série de jours affichée', async () => {
    await show(P({ streak: 6, lastActiveDay: '2026-03-10' }));
    expect(screen.getByText(`${t('fr', 'streak')}: 6`)).toBeTruthy();
  });

  it('hier: la série est encore vivante; avant-hier: rompue; jamais pratiqué: zéro', async () => {
    await show(P({ streak: 4, lastActiveDay: '2026-03-09' }));
    expect(screen.getByText(`${t('fr', 'streak')}: 4`)).toBeTruthy();
    await cleanup();
    await show(P({ streak: 4, lastActiveDay: '2026-03-08' }));
    expect(screen.getByText(`${t('fr', 'streak')}: 0`)).toBeTruthy();
    await cleanup();
    await show(P({ streak: 0, lastActiveDay: null }));
    expect(screen.getByText(`${t('fr', 'streak')}: 0`)).toBeTruthy();
  });

  it('une série interrompue (dernier jour il y a plusieurs jours) retombe à zéro à l\'affichage', async () => {
    await show(P({ streak: 6, lastActiveDay: '2026-03-01' }));
    expect(screen.getByText(`${t('fr', 'streak')}: 0`)).toBeTruthy();
  });
});

describe('accueil: leçons', () => {
  it('« Pour vous »: les deux leçons conseillées après la première, avec leur niveau; la première est dans le gros bouton', async () => {
    const onOpenLesson = jest.fn();
    await show(P(), { onOpenLesson });
    const rec = recommendLessons('A1', [], 3, 'en');
    expect(screen.getByText(`▶ ${t('fr', 'continueLesson')}: ${rec[0].title.fr}`)).toBeTruthy();
    expect(screen.getByText(`⭐ ${t('fr', 'recommended')}`)).toBeTruthy();
    await fireEvent.press(screen.getAllByLabelText(rec[1].title.fr)[0]);
    expect(onOpenLesson).toHaveBeenCalledWith(rec[1].id);
  });

  it('plus qu\'une seule leçon conseillée: pas de rubrique « Pour vous »', async () => {
    const real = LESSONS.filter((l) => l.id !== 'free');
    const done = real.slice(0, real.length - 1).map((l) => lessonKey(l.id, 'en'));
    const left = recommendLessons('A1', done, 5, 'en');
    expect(left.length).toBeLessThanOrEqual(1);
    await show(P({ completedLessons: done }));
    expect(screen.queryByText(`⭐ ${t('fr', 'recommended')}`)).toBeNull();
  });

  it('« Toutes les leçons »: toutes les leçons, niveau pour les nouvelles, « ✓ Terminé » pour les faites; toucher une leçon l\'ouvre', async () => {
    const onOpenLesson = jest.fn();
    await show(P({ completedLessons: [lessonKey('family', 'en')] }), { onOpenLesson });
    expect(screen.getByText(t('fr', 'allLessons'))).toBeTruthy();
    expect(screen.getByText(`✓ ${t('fr', 'done')}`)).toBeTruthy();
    expect(screen.getAllByText(`✓ ${t('fr', 'done')}`)).toHaveLength(1);
    const family = LESSONS.find((l) => l.id === 'family')!;
    await fireEvent.press(screen.getAllByLabelText(family.title.fr).pop()!);
    expect(onOpenLesson).toHaveBeenCalledWith('family');
    for (const l of LESSONS) expect(screen.getAllByLabelText(l.title.fr).length).toBeGreaterThan(0);
  });

  it('le niveau choisi décide de la leçon conseillée', async () => {
    await show(P(), {}, 'adult');
    await cleanup();
    await show(P(), { level: 'B1' });
    const b1 = recommendLessons('B1', [], 1, 'en')[0];
    expect(screen.getByText(`▶ ${t('fr', 'continueLesson')}: ${b1.title.fr}`)).toBeTruthy();
  });

  it('semaine et défi du jour présents', async () => {
    await show();
    expect(screen.getByText(`📊 ${t('fr', 'thisWeek')}`)).toBeTruthy();
  });
});

describe('accueil: autres profils et langues', () => {
  it.each(['kids', 'senior'] as const)('profil %s: l\'écran s\'affiche et le bouton principal fonctionne', async (profileId) => {
    const onOpenLesson = jest.fn();
    await show(P(), { onOpenLesson }, profileId);
    await fireEvent.press(screen.getByText(new RegExp(`▶ ${t('fr', 'continueLesson')}`)));
    expect(onOpenLesson).toHaveBeenCalledTimes(1);
  });

  it('arabe (droite à gauche): titres des leçons en arabe, sans plantage', async () => {
    await show(P(), { lang: 'ar' });
    expect(screen.getByText(LESSONS[0].title.ar)).toBeTruthy();
  });
});
