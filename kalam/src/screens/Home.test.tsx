import { Alert, Share } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { initialProgress } from '../domain/progress';
import { ThemeProvider } from '../theme/ThemeProvider';
import { HomeScreen } from './HomeScreen';

const noop = () => {};
const home = (progress: ReturnType<typeof initialProgress>, today: string, onExport: () => Promise<string> = async () => '{}') => (
  <ThemeProvider profileId="adult">
    <HomeScreen lang="fr" level="A1" progress={progress} onOpenLesson={noop} onGoal={noop} dueCount={0} onReview={noop}
      onSwitchProfile={noop} palette="violet" onPalette={noop} onLang={noop} onErase={noop} onExport={onExport} onDuo={noop} today={today} />
  </ThemeProvider>
);

describe('HomeScreen: changement de jour', () => {
  it('n\'affiche pas les minutes d\'hier comme celles d\'aujourd\'hui', async () => {
    const yesterday = { ...initialProgress('2026-03-09'), minutesToday: 10 };
    await render(home(yesterday, '2026-03-10'));
    expect(screen.getByText(/Objectif du jour: 0\/10/)).toBeTruthy();
    expect(screen.queryByText(/Objectif atteint/)).toBeNull();
  });
  it('affiche les minutes du jour quand c\'est bien aujourd\'hui', async () => {
    await render(home({ ...initialProgress('2026-03-10'), minutesToday: 4 }, '2026-03-10'));
    expect(screen.getByText(/Objectif du jour: 4\/10/)).toBeTruthy();
  });
  it('montre le défi du jour, le niveau et la semaine', async () => {
    await render(home(initialProgress('2026-03-10'), '2026-03-10'));
    expect(screen.getByText(/Défi du jour/)).toBeTruthy();
    expect(screen.getByText(/Niveau 1/)).toBeTruthy();
    expect(screen.getByText(/Cette semaine/)).toBeTruthy();
  });
});

describe('HomeScreen: export des données', () => {
  afterEach(() => jest.restoreAllMocks());

  it('« Exporter mes données » ouvre le partage avec le JSON complet', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await render(home(initialProgress('2026-03-10'), '2026-03-10', async () => '{"app":"kalam"}'));
    await fireEvent.press(screen.getByText('Exporter mes données'));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Mes données Kalam', message: '{"app":"kalam"}' }));
  });

  it('si l\'export échoue, un message clair s\'affiche (pas de plantage)', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('x'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(home(initialProgress('2026-03-10'), '2026-03-10'));
    await fireEvent.press(screen.getByText('Exporter mes données'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('L\'export a échoué. Réessayez.'));
  });
});
