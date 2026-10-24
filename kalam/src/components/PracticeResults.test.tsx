import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { PROBLEM_TEXT } from '../speech/problems';
import { t } from '../i18n/strings';
import { ThemeProvider } from '../theme/ThemeProvider';
import { PronunciationPractice } from './PronunciationPractice';

const mockListen = jest.fn();
const mockStop = jest.fn();
const mockCancel = jest.fn();
const mockOpenSettings = jest.fn();
let mockAvailable = true;

jest.mock('../speech/tts', () => ({ tts: { stop: (...a: unknown[]) => mockStop(...a) } }));
jest.mock('../speech/openSettings', () => ({ openAppSettings: (...a: unknown[]) => mockOpenSettings(...a) }));
jest.mock('../speech/recognizer', () => ({
  isSpeechInputAvailable: () => mockAvailable,
  cancelListening: (...a: unknown[]) => mockCancel(...a),
  listenOnce: (...a: unknown[]) => mockListen(...a),
}));

type P = Partial<React.ComponentProps<typeof PronunciationPractice>>;
const ui = (p: P = {}, profileId: 'adult' | 'kids' | 'senior' = 'adult') => (
  <ThemeProvider profileId={profileId}><PronunciationPractice lang="fr" expected="good morning" {...p} /></ThemeProvider>
);
const SAY = t('fr', 'sayIt');
const press = async () => { await fireEvent.press(screen.getByLabelText(SAY)); };

beforeEach(() => { jest.clearAllMocks(); mockAvailable = true; mockStop.mockResolvedValue(undefined); });
afterEach(async () => { await cleanup(); });

describe('exercice de prononciation: résultats', () => {
  it('parfait: 100 %, chaque mot coché avec son nom accessible', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'good morning' });
    await render(ui());
    await press();
    expect(await screen.findByText('100%')).toBeTruthy();
    expect(screen.getByLabelText(`good: ${t('fr', 'correct')}`)).toBeTruthy();
    expect(screen.getByLabelText(`morning: ${t('fr', 'correct')}`)).toBeTruthy();
    expect(screen.getByText('✓ good')).toBeTruthy();
    expect(screen.queryByText(new RegExp(t('fr', 'heardAs')))).toBeNull();
  });

  it('mot proche, mot faux, mot manquant: symbole ET texte, avec ce qui a été compris', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'aaabb' });
    await render(ui({ expected: 'aaaaa zzzzz yyyyy' }));
    await press();
    expect(await screen.findByText('17%')).toBeTruthy(); // (0,5 + 0 + 0) / 3
    expect(screen.getByText('~ aaaaa')).toBeTruthy();
    expect(screen.getByText('… zzzzz')).toBeTruthy();
    expect(screen.getByText('… yyyyy')).toBeTruthy();
    expect(screen.getByLabelText(`aaaaa: ${t('fr', 'close')}`)).toBeTruthy();
    expect(screen.getByLabelText(`zzzzz: ${t('fr', 'missing')}`)).toBeTruthy();
    expect(screen.getByText(`${t('fr', 'heardAs')} “aaabb”`)).toBeTruthy();
  });

  it('mot faux: croix et « compris comme »', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'bbbbb' });
    await render(ui({ expected: 'aaaaa' }));
    await press();
    expect(await screen.findByText('0%')).toBeTruthy();
    expect(screen.getByText('✗ aaaaa')).toBeTruthy();
    expect(screen.getByLabelText(`aaaaa: ${t('fr', 'wrong')}`)).toBeTruthy();
    expect(screen.getByText(`${t('fr', 'heardAs')} “bbbbb”`)).toBeTruthy();
  });

  it('la langue apprise décide de la reconnaissance; options de l\'écoute', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'bonjour' });
    await render(ui({ target: 'fr', expected: 'bonjour' }));
    await press();
    await screen.findByText('100%');
    expect(mockListen).toHaveBeenCalledWith(expect.objectContaining({ lang: 'fr-FR', maxMs: 10_000, patienceMs: expect.any(Number) }));
    await cleanup();
    mockListen.mockClear();
    await render(ui({ expected: 'hello' }));
    await press();
    expect(mockListen).toHaveBeenCalledWith(expect.objectContaining({ lang: 'en-US' }));
  });

  it('la patience dépend du profil (le senior a plus de temps que l\'adulte)', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'x' });
    await render(ui({}, 'adult'));
    await press();
    const adult = mockListen.mock.calls[0][0].patienceMs;
    await cleanup();
    mockListen.mockClear();
    await render(ui({}, 'senior'));
    await press();
    expect(mockListen.mock.calls[0][0].patienceMs).toBeGreaterThan(adult);
  });

  it('la voix de l\'application est coupée avant d\'ouvrir le micro', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'x' });
    await render(ui());
    await press();
    expect(mockStop).toHaveBeenCalledTimes(1);
  });
});

describe('exercice de prononciation: état d\'écoute et problèmes', () => {
  it('pendant l\'écoute: bouton occupé et désactivé, texte provisoire lu à voix haute; puis retour à la normale', async () => {
    let finish: (v: unknown) => void = () => {};
    let partial: (s: string) => void = () => {};
    mockListen.mockImplementation((o: { onPartial: (s: string) => void }) => { partial = o.onPartial; return new Promise((res) => { finish = res; }); });
    await render(ui());
    void fireEvent.press(screen.getByLabelText(SAY)); // l'écoute reste en cours exprès: on n'attend pas la fin de l'action
    const busy = await screen.findByLabelText(t('fr', 'listening'));
    expect(busy).toBeDisabled();
    expect(busy).toHaveProp('accessibilityState', expect.objectContaining({ busy: true }));
    await act(async () => { partial('good mor'); });
    expect(screen.getByText('“good mor”')).toBeTruthy();
    await act(async () => { finish({ ok: true, transcript: 'good morning' }); });
    expect(screen.getByLabelText(SAY)).not.toBeDisabled();
    expect(screen.queryByText('“good mor”')).toBeNull();
  });

  it.each([
    ['no-speech', 'no-speech'], ['permission', 'permission'], ['unavailable', 'unavailable'], ['network', 'network-mic'], ['language', 'language'], ['busy', 'mic-error'], ['error', 'mic-error'],
  ] as const)('micro en échec « %s »: message clair, pas de bouton réglages, on peut réessayer', async (reason, problem) => {
    mockListen.mockResolvedValue({ ok: false, reason });
    await render(ui());
    await press();
    expect(await screen.findByText(t('fr', PROBLEM_TEXT[problem]))).toBeTruthy();
    expect(screen.queryByText(t('fr', 'openSettings'))).toBeNull();
    expect(screen.getByLabelText(SAY)).not.toBeDisabled();
  });

  it('refus définitif: message et bouton qui ouvre les réglages du téléphone', async () => {
    mockListen.mockResolvedValue({ ok: false, reason: 'permission-blocked' });
    await render(ui());
    await press();
    expect(await screen.findByText(t('fr', PROBLEM_TEXT['permission-blocked']))).toBeTruthy();
    await fireEvent.press(screen.getByText(t('fr', 'openSettings')));
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('annulation volontaire: aucun message, aucun résultat', async () => {
    mockListen.mockResolvedValue({ ok: false, reason: 'cancelled' });
    const onResult = jest.fn();
    await render(ui({ onResult }));
    await press();
    expect(screen.getByLabelText(SAY)).not.toBeDisabled();
    expect(screen.queryByText(/%$/)).toBeNull();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('un nouvel essai efface le message ou le résultat précédent', async () => {
    mockListen.mockResolvedValueOnce({ ok: false, reason: 'no-speech' }).mockResolvedValueOnce({ ok: true, transcript: 'good morning' });
    await render(ui());
    await press();
    expect(await screen.findByText(t('fr', PROBLEM_TEXT['no-speech']))).toBeTruthy();
    await press();
    expect(await screen.findByText('100%')).toBeTruthy();
    expect(screen.queryByText(t('fr', PROBLEM_TEXT['no-speech']))).toBeNull();
  });

  it('changer de phrase efface le résultat de la phrase précédente', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'good morning' });
    const view = await render(ui());
    await press();
    expect(await screen.findByText('100%')).toBeTruthy();
    await view.rerender(ui({ expected: 'good night' }));
    expect(screen.queryByText('100%')).toBeNull();
  });

  it('sans reconnaissance vocale sur l\'appareil: message, pas de bouton micro', async () => {
    mockAvailable = false;
    await render(ui());
    expect(screen.getByText(t('fr', 'micUnavailable'))).toBeTruthy();
    expect(screen.queryByLabelText(SAY)).toBeNull();
  });

  it('en quittant l\'écran, l\'écoute en cours est annulée', async () => {
    const view = await render(ui());
    mockCancel.mockClear();
    await view.unmount();
    expect(mockCancel).toHaveBeenCalled();
  });
});
