import { Alert, Linking, Share } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { t } from '../i18n/strings';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ReminderResult, ReminderSetting } from '../notifications/reminders';
import { SettingsScreen } from './SettingsScreen';

type H = Partial<{ onGoal: (g: 5 | 10 | 20) => void; onPalette: (p: string) => void; onLang: (l: string) => void; onSwitchProfile: () => void; onExport: () => Promise<string>; onErase: () => void; onBack: () => void; onReminder: (r: ReminderSetting) => Promise<ReminderResult>; reminder: ReminderSetting; reminderAvailable: boolean; onDiagnostic: () => void }>;
const show = (h: H = {}, goal: 5 | 10 | 20 = 10) => render(
  <ThemeProvider profileId="adult">
    <SettingsScreen lang="fr" dailyGoal={goal} onGoal={h.onGoal ?? jest.fn()} palette="violet" onPalette={(h.onPalette ?? jest.fn()) as never} onLang={(h.onLang ?? jest.fn()) as never}
      onSwitchProfile={h.onSwitchProfile ?? jest.fn()} onExport={h.onExport ?? (async () => '{}')} onErase={h.onErase ?? jest.fn()} onBack={h.onBack ?? jest.fn()}
      reminder={h.reminder ?? { enabled: false, hour: 19, minute: 0 }} reminderAvailable={h.reminderAvailable ?? true} onReminder={h.onReminder ?? (async () => ({ ok: true }))} onDiagnostic={h.onDiagnostic} />
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
  it('profil senior (contraste élevé): pas de choix de couleurs (il n\'aurait aucun effet visible), le reste est là', async () => {
    await render(
      <ThemeProvider profileId="senior">
        <SettingsScreen lang="fr" dailyGoal={10} onGoal={jest.fn()} palette="violet" onPalette={jest.fn() as never} onLang={jest.fn() as never} onSwitchProfile={jest.fn()} onExport={async () => '{}'}
          onErase={jest.fn()} onBack={jest.fn()} reminder={{ enabled: false, hour: 19, minute: 0 }} reminderAvailable onReminder={async () => ({ ok: true })} />
      </ThemeProvider>,
    );
    expect(screen.queryByLabelText('Océan')).toBeNull();
    expect(screen.getByLabelText('English')).toBeTruthy();
    expect(screen.getByLabelText('20 min')).toBeTruthy();
  });
  it('rappels indisponibles sur cet appareil mais un rappel déjà activé: on peut toujours l\'éteindre', async () => {
    const onReminder = jest.fn(async () => ({ ok: true as const }));
    await show({ reminder: { enabled: true, hour: 19, minute: 0 }, reminderAvailable: false, onReminder });
    const sw = screen.getByLabelText(t('fr', 'reminderToggle'));
    expect(sw).toHaveProp('disabled', false);
    await fireEvent(sw, 'valueChange', false);
    expect(onReminder).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
  it('rappels indisponibles et pas activé: l\'interrupteur reste désactivé (rien à éteindre)', async () => {
    await show({ reminder: { enabled: false, hour: 19, minute: 0 }, reminderAvailable: false });
    expect(screen.getByLabelText(t('fr', 'reminderToggle'))).toHaveProp('disabled', true);
  });
  it('double appui sur « Exporter »: un seul partage à la fois', async () => {
    let release: (v: string) => void = () => {};
    const onExport = jest.fn(() => new Promise<string>((r) => { release = r; }));
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    await show({ onExport });
    const btn = screen.getByText('Exporter mes données');
    await act(async () => { void fireEvent.press(btn); void fireEvent.press(btn); });
    expect(onExport).toHaveBeenCalledTimes(1);
    await act(async () => { release('{}'); });
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    void fireEvent.press(btn); // après la fin, on peut exporter de nouveau (sans attendre: l'export est de nouveau en cours)
    await waitFor(() => expect(onExport).toHaveBeenCalledTimes(2));
    await act(async () => { release('{}'); });
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

  describe('rappel quotidien', () => {
    const off = { enabled: false, hour: 19, minute: 0 };
    const on = { enabled: true, hour: 19, minute: 0 };

    it('désactivé par défaut: pas de choix d\'heure tant qu\'il n\'est pas activé', async () => {
      await show({ reminder: off });
      expect(screen.getByLabelText('Me rappeler chaque jour')).toBeTruthy();
      expect(screen.queryByLabelText('08:00')).toBeNull();
    });

    it('activer demande l\'activation au reste de l\'app avec l\'heure en cours', async () => {
      const onReminder = jest.fn(async () => ({ ok: true as const }));
      await show({ reminder: off, onReminder });
      await fireEvent(screen.getByLabelText('Me rappeler chaque jour'), 'valueChange', true);
      expect(onReminder).toHaveBeenCalledWith({ enabled: true, hour: 19, minute: 0 });
    });

    it('activé: propose 4 heures, la bonne est sélectionnée, et en choisir une autre change l\'heure', async () => {
      const onReminder = jest.fn(async () => ({ ok: true as const }));
      await show({ reminder: on, onReminder });
      expect(screen.getByLabelText('19:00')).toBeSelected();
      expect(screen.getByLabelText('08:00')).not.toBeSelected();
      await fireEvent.press(screen.getByLabelText('08:00'));
      expect(onReminder).toHaveBeenCalledWith({ enabled: true, hour: 8, minute: 0 });
    });

    it('notifications refusées: message clair, sans bloquer l\'écran', async () => {
      await show({ reminder: off, onReminder: async () => ({ ok: false as const, reason: 'permission' as const }) });
      await fireEvent(screen.getByLabelText('Me rappeler chaque jour'), 'valueChange', true);
      expect(await screen.findByText(/notifications sont refusées/)).toBeTruthy();
    });

    it('notifications bloquées: propose d\'ouvrir les réglages du téléphone', async () => {
      const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
      await show({ reminder: off, onReminder: async () => ({ ok: false as const, reason: 'permission-blocked' as const }) });
      await fireEvent(screen.getByLabelText('Me rappeler chaque jour'), 'valueChange', true);
      await fireEvent.press(await screen.findByLabelText('Ouvrir les réglages'));
      expect(open).toHaveBeenCalledTimes(1);
    });

    it('appareil sans notifications: interrupteur désactivé et explication', async () => {
      await show({ reminder: off, reminderAvailable: false });
      expect(screen.getByLabelText('Me rappeler chaque jour')).toHaveProp('disabled', true);
      expect(screen.getByText(/pas disponibles sur cet appareil/)).toBeTruthy();
    });
  });

  describe('diagnostic de l\'appareil', () => {
    it('bouton présent quand l\'accès est fourni, et il ouvre le diagnostic', async () => {
      const onDiagnostic = jest.fn();
      await show({ onDiagnostic });
      await fireEvent.press(screen.getByText(`🩺 ${t('fr', 'diagnostic')}`));
      expect(onDiagnostic).toHaveBeenCalledTimes(1);
    });
    it('absent quand l\'accès n\'est pas fourni', async () => {
      await show();
      expect(screen.queryByText(`🩺 ${t('fr', 'diagnostic')}`)).toBeNull();
    });
  });
});
