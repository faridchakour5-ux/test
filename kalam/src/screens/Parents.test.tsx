import { Alert, Share } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { initialKids } from '../state/AppState';
import { resetGateLock } from '../state/gateLock';
import { t } from '../i18n/strings';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ParentsScreen } from './ParentsScreen';

// Math.random à 0 → question 6 × 6 = 36, propositions [26, 46, 35, 36] (ordre fixe).
const RIGHT = '36';
const WRONG = '26';

type H = Partial<React.ComponentProps<typeof ParentsScreen>>;
const show = (h: H = {}) => render(
  <ThemeProvider profileId="adult">
    <ParentsScreen lang="fr" kids={{ ...initialKids(), stars: 7, storiesRead: ['a', 'b'] }} minutesToday={12}
      onMic={jest.fn()} onLimit={jest.fn()} onSwitchProfile={jest.fn()} onErase={jest.fn()} onBack={jest.fn()}
      palette="violet" onPalette={jest.fn()} onLang={jest.fn()} onExport={async () => '{}'} {...h} />
  </ThemeProvider>,
);
const unlock = async () => { await fireEvent.press(screen.getByLabelText(RIGHT)); };

beforeEach(() => { resetGateLock(); jest.spyOn(Math, 'random').mockReturnValue(0); });
afterEach(async () => { await cleanup(); jest.useRealTimers(); jest.restoreAllMocks(); });

describe('portail parental', () => {
  it('derrière le portail: question d\'adulte, quatre réponses, aucun réglage visible', async () => {
    await show();
    expect(screen.getByText(new RegExp(`${t('fr', 'gateIntro').replace(/\s/g, ' ')} 6 × 6`))).toBeTruthy();
    for (const o of ['26', '46', '35', '36']) expect(screen.getByLabelText(o)).toBeTruthy();
    expect(screen.queryByLabelText(t('fr', 'micConsentTitle'))).toBeNull();
    expect(screen.queryByText(t('fr', 'eraseTitle'))).toBeNull();
  });

  it('une mauvaise réponse affiche un message, ne débloque rien, et renouvelle la question', async () => {
    await show();
    await fireEvent.press(screen.getByLabelText(WRONG));
    expect(screen.getByText(t('fr', 'gateWrong'))).toBeTruthy();
    expect(screen.queryByLabelText(t('fr', 'micConsentTitle'))).toBeNull();
    expect(screen.getByLabelText(RIGHT)).not.toBeDisabled();
  });

  it('trois erreurs de suite: pause de 30 s, boutons désactivés, message de pause; puis réactivés', async () => {
    let clock = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    jest.useFakeTimers({ doNotFake: ['Date', 'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate'] });
    await show();
    for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByLabelText(WRONG));
    expect(screen.getByText(t('fr', 'gateLocked'))).toBeTruthy();
    expect(screen.getByLabelText(RIGHT)).toBeDisabled();
    // même la bonne réponse ne passe pas pendant la pause
    await fireEvent.press(screen.getByLabelText(RIGHT));
    expect(screen.queryByLabelText(t('fr', 'micConsentTitle'))).toBeNull();
    clock += 29_000;
    await act(async () => { jest.advanceTimersByTime(29_000); });
    expect(screen.getByLabelText(RIGHT)).toBeDisabled();
    clock += 2_000;
    await act(async () => { jest.advanceTimersByTime(2_000); });
    jest.useRealTimers();
    expect(screen.getByLabelText(RIGHT)).not.toBeDisabled();
    await unlock();
    expect(screen.getByLabelText(t('fr', 'micConsentTitle'))).toBeTruthy();
  });

  it('la pause survit à la fermeture et la réouverture de l\'écran (pas de contournement en revenant)', async () => {
    const first = await show();
    for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByLabelText(WRONG));
    await first.unmount();
    await show();
    expect(screen.getByText(t('fr', 'gateLocked'))).toBeTruthy();
    expect(screen.getByLabelText(RIGHT)).toBeDisabled();
  });

  it('une bonne réponse remet le compteur d\'erreurs à zéro', async () => {
    const first = await show();
    await fireEvent.press(screen.getByLabelText(WRONG));
    await fireEvent.press(screen.getByLabelText(WRONG));
    await unlock();
    await first.unmount();
    await show();
    await fireEvent.press(screen.getByLabelText(WRONG));
    await fireEvent.press(screen.getByLabelText(WRONG));
    expect(screen.getByLabelText(RIGHT)).not.toBeDisabled(); // 2 erreurs seulement, pas 4
  });

  it('retour: fonctionne aussi derrière le portail', async () => {
    const onBack = jest.fn();
    await show({ onBack });
    await fireEvent.press(screen.getByText(/Retour/));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('réglages parentaux (après le portail)', () => {
  it('progression de l\'enfant: étoiles, histoires lues, minutes du jour', async () => {
    await show();
    await unlock();
    expect(screen.getByText(`⭐ 7 ${t('fr', 'stars')}`)).toBeTruthy();
    expect(screen.getByText(`📖 ${t('fr', 'storiesRead')}: 2`)).toBeTruthy();
    expect(screen.getByText(`⏱ ${t('fr', 'minutesToday')}: 12`)).toBeTruthy();
  });

  it('micro: désactivé par défaut; le consentement se donne et se retire par l\'interrupteur', async () => {
    const onMic = jest.fn();
    await show({ onMic });
    await unlock();
    const sw = screen.getByLabelText(t('fr', 'micConsentTitle'));
    expect(sw).toHaveProp('value', false);
    await fireEvent(sw, 'valueChange', true);
    expect(onMic).toHaveBeenCalledWith(true);
    await fireEvent(sw, 'valueChange', false);
    expect(onMic).toHaveBeenLastCalledWith(false);
  });

  it('micro déjà autorisé: l\'interrupteur est allumé', async () => {
    await show({ kids: { ...initialKids(), consent: { micAllowed: true, grantedAt: 5, version: 1 } } });
    await unlock();
    expect(screen.getByLabelText(t('fr', 'micConsentTitle'))).toHaveProp('value', true);
  });

  it('limite de temps: 10, 20, 30 minutes ou aucune; la limite actuelle est marquée', async () => {
    const onLimit = jest.fn();
    await show({ onLimit, kids: { ...initialKids(), dailyLimit: 20 } });
    await unlock();
    await fireEvent.press(screen.getByText(`10 ${t('fr', 'minutes')}`));
    await fireEvent.press(screen.getByText(`30 ${t('fr', 'minutes')}`));
    await fireEvent.press(screen.getByText(t('fr', 'noLimit')));
    await fireEvent.press(screen.getByText(`20 ${t('fr', 'minutes')}`));
    expect(onLimit.mock.calls.map((c) => c[0])).toEqual([10, 30, null, 20]);
    expect(screen.getByRole('button', { name: `20 ${t('fr', 'minutes')}`, selected: true })).toBeTruthy();
    expect(screen.queryByRole('button', { name: `10 ${t('fr', 'minutes')}`, selected: true })).toBeNull();
    expect(screen.queryByRole('button', { name: t('fr', 'noLimit'), selected: true })).toBeNull();
  });

  it('« Pas de limite » est marqué quand il n\'y a pas de limite', async () => {
    await show({ kids: { ...initialKids(), dailyLimit: null } });
    await unlock();
    expect(screen.getByRole('button', { name: t('fr', 'noLimit'), selected: true })).toBeTruthy();
    expect(screen.queryByRole('button', { name: `20 ${t('fr', 'minutes')}`, selected: true })).toBeNull();
  });

  it('changer de profil et revenir', async () => {
    const onSwitchProfile = jest.fn(); const onBack = jest.fn();
    await show({ onSwitchProfile, onBack });
    await unlock();
    await fireEvent.press(screen.getByText(t('fr', 'switchProfile')));
    await fireEvent.press(screen.getByText(/Retour/));
    expect(onSwitchProfile).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('export: partage le JSON des données; en cas d\'échec, un message clair', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await show({ onExport: async () => '{"app":"kalam"}' });
    await unlock();
    await fireEvent.press(screen.getByText(t('fr', 'exportMine')));
    await act(async () => {});
    expect(share).toHaveBeenCalledWith({ title: t('fr', 'exportTitle'), message: '{"app":"kalam"}' });
    share.mockRejectedValue(new Error('x'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await fireEvent.press(screen.getByText(t('fr', 'exportMine')));
    await act(async () => {});
    expect(alert).toHaveBeenCalledWith(t('fr', 'exportFailed'));
  });

  it('effacement: demande confirmation (annuler / effacer) avant d\'agir', async () => {
    const onErase = jest.fn();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await show({ onErase });
    await unlock();
    await fireEvent.press(screen.getAllByText(t('fr', 'eraseTitle')).pop()!);
    expect(onErase).not.toHaveBeenCalled();
    expect(alert.mock.calls[0][0]).toBe(t('fr', 'eraseTitle'));
    expect(alert.mock.calls[0][1]).toBe(t('fr', 'eraseBody'));
    const buttons = alert.mock.calls[0][2] as { text: string; style?: string; onPress?: () => void }[];
    expect(buttons.map((b) => [b.text, b.style])).toEqual([[t('fr', 'cancel'), 'cancel'], [t('fr', 'eraseConfirm'), 'destructive']]);
    buttons[0].onPress?.();
    expect(onErase).not.toHaveBeenCalled();
    buttons[1].onPress?.();
    expect(onErase).toHaveBeenCalledTimes(1);
  });

  it('langue et couleurs modifiables depuis les réglages parentaux', async () => {
    const onLang = jest.fn(); const onPalette = jest.fn();
    await show({ onLang, onPalette });
    await unlock();
    await fireEvent.press(screen.getByLabelText('English'));
    await fireEvent.press(screen.getByLabelText('Océan'));
    expect(onLang).toHaveBeenCalledWith('en');
    expect(onPalette).toHaveBeenCalledWith('ocean');
  });
});
