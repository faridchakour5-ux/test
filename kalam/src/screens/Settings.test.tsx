import { Alert, Share } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { SettingsScreen } from './SettingsScreen';

type H = Partial<{ onGoal: (g: 5 | 10 | 20) => void; onPalette: (p: string) => void; onLang: (l: string) => void; onSwitchProfile: () => void; onExport: () => Promise<string>; onErase: () => void; onBack: () => void }>;
const show = (h: H = {}, goal: 5 | 10 | 20 = 10) => render(
  <ThemeProvider profileId="adult">
    <SettingsScreen lang="fr" dailyGoal={goal} onGoal={h.onGoal ?? jest.fn()} palette="violet" onPalette={(h.onPalette ?? jest.fn()) as never} onLang={(h.onLang ?? jest.fn()) as never}
      onSwitchProfile={h.onSwitchProfile ?? jest.fn()} onExport={h.onExport ?? (async () => '{}')} onErase={h.onErase ?? jest.fn()} onBack={h.onBack ?? jest.fn()} />
  </ThemeProvider>,
);

afterEach(() => jest.restoreAllMocks());

describe('SettingsScreen', () => {
  it('regroupe langue de l\'interface, couleurs, objectif, profil, export et effacement', async () => {
    await show();
    expect(screen.getByText(/Réglages/)).toBeTruthy();
    expect(screen.getByLabelText('English')).toBeTruthy();
    expect(screen.getByLabelText('Océan')).toBeTruthy();
    expect(screen.getByLabelText('20 min')).toBeTruthy();
    expect(screen.getByText('Changer de profil')).toBeTruthy();
    expect(screen.getByText('Exporter mes données')).toBeTruthy();
    expect(screen.getByText('Effacer mes données')).toBeTruthy();
  });
  it('change l\'objectif quotidien, la langue et la palette', async () => {
    const onGoal = jest.fn(); const onLang = jest.fn(); const onPalette = jest.fn();
    await show({ onGoal, onLang, onPalette });
    await fireEvent.press(screen.getByLabelText('20 min'));
    await fireEvent.press(screen.getByLabelText('English'));
    await fireEvent.press(screen.getByLabelText('Océan'));
    expect(onGoal).toHaveBeenCalledWith(20);
    expect(onLang).toHaveBeenCalledWith('en');
    expect(onPalette).toHaveBeenCalledWith('ocean');
  });
  it('l\'objectif actuel est marqué comme sélectionné', async () => {
    await show({}, 5);
    expect(screen.getByLabelText('5 min')).toHaveProp('accessibilityState', { selected: true });
    expect(screen.getByLabelText('10 min')).toHaveProp('accessibilityState', { selected: false });
  });
  it('« Exporter mes données » ouvre le partage avec le JSON complet', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await show({ onExport: async () => '{"app":"kalam"}' });
    await fireEvent.press(screen.getByText('Exporter mes données'));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Mes données Kalam', message: '{"app":"kalam"}' }));
  });
  it('si l\'export échoue, un message clair s\'affiche (pas de plantage)', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('x'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await show();
    await fireEvent.press(screen.getByText('Exporter mes données'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('L\'export a échoué. Réessayez.'));
  });
  it('l\'effacement demande une confirmation avant d\'agir', async () => {
    const onErase = jest.fn();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await show({ onErase });
    await fireEvent.press(screen.getByText('Effacer mes données'));
    expect(onErase).not.toHaveBeenCalled(); // pas d'effacement sans confirmation
    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => void; style?: string }[];
    expect(buttons.map((b) => b.text)).toEqual(['Annuler', 'Effacer']);
    buttons[1].onPress?.();
    expect(onErase).toHaveBeenCalledTimes(1);
  });
  it('« Changer de profil » et « Retour » fonctionnent', async () => {
    const onSwitchProfile = jest.fn(); const onBack = jest.fn();
    await show({ onSwitchProfile, onBack });
    await fireEvent.press(screen.getByText('Changer de profil'));
    await fireEvent.press(screen.getByText(/Retour/));
    expect(onSwitchProfile).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });
});
