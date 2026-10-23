import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { WeekChart, weekdayInitial } from './WeekChart';
import { UI_LANGS } from '../i18n/strings';

const bars = [0, 0, 5, 12, 0, 20, 8].map((minutes, i) => ({ day: `2026-03-${String(6 + i).padStart(2, '0')}`, minutes, isToday: i === 6 }));

describe('WeekChart', () => {
  it('décrit le graphique en texte pour les lecteurs d\'écran (total et leçons)', async () => {
    await render(<ThemeProvider profileId="adult"><WeekChart lang="fr" bars={bars} goal={10} lessonsDone={3} /></ThemeProvider>);
    expect(screen.getByLabelText('7 derniers jours: 45 minutes au total, 3 leçons terminées')).toBeTruthy();
    expect(screen.getByText('45 minutes au total · 3 leçons terminées')).toBeTruthy();
  });
  it('fonctionne avec une semaine vide', async () => {
    const empty = bars.map((b) => ({ ...b, minutes: 0 }));
    await render(<ThemeProvider profileId="senior"><WeekChart lang="en" bars={empty} goal={10} lessonsDone={0} /></ThemeProvider>);
    expect(screen.getByLabelText('Last 7 days: 0 minutes in total, 0 lessons completed')).toBeTruthy();
  });
  it('donne une initiale de jour dans chaque langue', () => {
    for (const lang of UI_LANGS) expect(weekdayInitial('2026-03-09', lang).length).toBeGreaterThan(0);
    expect(weekdayInitial('2026-03-09', 'en')).toBe('M'); // lundi
  });
});
