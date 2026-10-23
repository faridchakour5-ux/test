import { Alert, Share } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { initialProgress } from '../domain/progress';
import { ThemeProvider } from '../theme/ThemeProvider';
import { HomeScreen } from './HomeScreen';

const noop = () => {};
const home = (progress: ReturnType<typeof initialProgress>, today: string, onExport: () => Promise<string> = async () => '{}', target: 'en' | 'fr' = 'en', onTarget: (t: 'en' | 'fr') => void = noop) => (
  <ThemeProvider profileId="adult">
    <HomeScreen lang="fr" level="A1" progress={progress} onOpenLesson={noop} onGoal={noop} dueCount={0} onReview={noop}
      onSwitchProfile={noop} palette="violet" onPalette={noop} onLang={noop} onErase={noop} onExport={onExport} onDuo={noop} target={target} onTarget={onTarget} today={today} />
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

describe('HomeScreen: langue apprise', () => {
  it('propose anglais et français et prévient du choix', async () => {
    const onTarget = jest.fn();
    await render(home(initialProgress('2026-03-10'), '2026-03-10', async () => '{}', 'en', onTarget));
    expect(screen.getByLabelText('Langue à apprendre: Anglais')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Langue à apprendre: Français'));
    expect(onTarget).toHaveBeenCalledWith('fr');
    expect(screen.queryByLabelText(/Langue à apprendre: (Espagnol|Arabe)/)).toBeNull(); // pas d'autre langue pour l'instant
    expect(screen.getAllByLabelText('Français')).toHaveLength(1); // le sélecteur de la langue de l'interface, distinct
  });
  it('les leçons terminées en anglais ne comptent pas comme terminées en français', async () => {
    const p = { ...initialProgress('2026-03-10'), completedLessons: ['family'] };
    await render(home(p, '2026-03-10', async () => '{}', 'en'));
    expect(screen.getAllByText(/✓ Terminée/)).toHaveLength(1);
  });
  it('...et inversement: « fr:family » ne compte que pour le français', async () => {
    const p = { ...initialProgress('2026-03-10'), completedLessons: ['fr:family'] };
    await render(home(p, '2026-03-10', async () => '{}', 'en'));
    expect(screen.queryAllByText(/✓ Terminée/)).toHaveLength(0);
  });
});
