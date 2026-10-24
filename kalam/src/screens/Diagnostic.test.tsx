import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { DiagnosticDeps } from '../diagnostics/diagnostics';
import { UI_LANGS, t, tf } from '../i18n/strings';
import { PROBLEM_TEXT } from '../speech/problems';
import { ThemeProvider } from '../theme/ThemeProvider';
import { DiagnosticScreen } from './DiagnosticScreen';

const mockSpeak = jest.fn();
const mockStop = jest.fn();
const mockListen = jest.fn();
jest.mock('../speech/tts', () => ({ tts: { speak: (...a: unknown[]) => mockSpeak(...a), stop: (...a: unknown[]) => mockStop(...a), hasVoice: async () => true } }));
jest.mock('../speech/recognizer', () => ({ isSpeechInputAvailable: () => true, cancelListening: jest.fn(), listenOnce: (...a: unknown[]) => mockListen(...a) }));

const okFetch = (over: Record<string, unknown> = {}) => jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, configured: true, ...over }) }) as unknown as typeof fetch;
const deps = (over: Partial<DiagnosticDeps> = {}): Partial<DiagnosticDeps> => ({
  serverUrl: () => 'https://api.kalam.app', fetchImpl: okFetch(), hasVoice: async () => true, micAvailable: () => true, notificationsAvailable: () => true, ...over,
});
const show = async (d: Partial<DiagnosticDeps> = deps(), lang: (typeof UI_LANGS)[number] = 'fr', onBack = jest.fn()) => {
  await render(<ThemeProvider profileId="adult"><DiagnosticScreen lang={lang} onBack={onBack} deps={d} /></ThemeProvider>);
  await act(async () => {});
  return { onBack };
};

beforeEach(() => { jest.clearAllMocks(); mockStop.mockResolvedValue(undefined); });
afterEach(async () => { await cleanup(); });

describe('écran de diagnostic', () => {
  it('tout va bien: résumé positif et les quatre points avec symbole ET texte', async () => {
    await show();
    expect(screen.getByRole('header', { name: `🩺 ${t('fr', 'diagnostic')}` })).toBeTruthy();
    expect(screen.getByText(`✓ ${t('fr', 'diagAllOk')}`)).toBeTruthy();
    for (const k of ['diagServer', 'diagVoice', 'diagMic', 'diagNotif'] as const) expect(screen.getByText(`✓ ${t('fr', k)}`)).toBeTruthy();
    expect(screen.getByText(t('fr', 'diagServerOk'))).toBeTruthy();
    expect(screen.getByText(t('fr', 'diagVoiceOk'))).toBeTruthy();
    expect(screen.getByText(t('fr', 'diagMicOk'))).toBeTruthy();
    expect(screen.getByText(t('fr', 'diagNotifOk'))).toBeTruthy();
  });

  it('un message de vérification en cours s\'affiche avant le résultat', async () => {
    let release: (v: unknown) => void = () => {};
    const f = jest.fn().mockImplementation(() => new Promise((res) => { release = res; })) as unknown as typeof fetch;
    await render(<ThemeProvider profileId="adult"><DiagnosticScreen lang="fr" onBack={jest.fn()} deps={deps({ fetchImpl: f })} /></ThemeProvider>);
    expect(await screen.findByText(t('fr', 'diagChecking'))).toBeTruthy();
    await act(async () => { release({ ok: true, status: 200, json: async () => ({ ok: true, configured: true }) }); });
    expect(screen.queryByText(t('fr', 'diagChecking'))).toBeNull();
    expect(screen.getByText(`✓ ${t('fr', 'diagAllOk')}`)).toBeTruthy();
  });

  it('serveur sans clé: réserve visible avec la bonne explication', async () => {
    await show(deps({ fetchImpl: okFetch({ configured: false }) }));
    expect(screen.getByText(`⚠ ${t('fr', 'diagSomeWarn')}`)).toBeTruthy();
    expect(screen.getByText(t('fr', 'diagServerNoKey'))).toBeTruthy();
  });

  it('adresse du serveur absente: échec avec l\'explication « https »', async () => {
    await show(deps({ serverUrl: () => { throw new Error('x'); } }));
    expect(screen.getByText(`✗ ${t('fr', 'diagSomeFail')}`)).toBeTruthy();
    expect(screen.getByText(t('fr', 'diagServerConfig'))).toBeTruthy();
  });

  it('serveur injoignable: explication claire', async () => {
    await show(deps({ fetchImpl: jest.fn().mockRejectedValue(new TypeError('x')) as unknown as typeof fetch }));
    expect(screen.getByText(t('fr', 'diagServerDown'))).toBeTruthy();
  });

  it('voix française manquante: nomme la langue; aucune voix: nomme les deux', async () => {
    await show(deps({ hasVoice: async (l) => l === 'en-US' }));
    expect(screen.getByText(tf('fr', 'diagVoicePart', { langs: 'Français' }))).toBeTruthy();
    await cleanup();
    await show(deps({ hasVoice: async () => false }));
    expect(screen.getByText(tf('fr', 'diagVoiceNone', { langs: 'English, Français' }))).toBeTruthy();
  });

  it('pas de micro: échec; pas de rappels: simple réserve', async () => {
    await show(deps({ micAvailable: () => false }));
    expect(screen.getByText(`✗ ${t('fr', 'diagMic')}`)).toBeTruthy();
    expect(screen.getByText(t('fr', 'diagMicNo'))).toBeTruthy();
    await cleanup();
    await show(deps({ notificationsAvailable: () => false }));
    expect(screen.getByText(`⚠ ${t('fr', 'diagNotif')}`)).toBeTruthy();
    expect(screen.getByText(`⚠ ${t('fr', 'diagSomeWarn')}`)).toBeTruthy();
  });

  it('« Relancer » refait toutes les vérifications', async () => {
    const f = okFetch();
    await show(deps({ fetchImpl: f }));
    expect(f).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText(t('fr', 'diagRun')));
    await act(async () => {});
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('test de la voix: dit une phrase en anglais', async () => {
    await show();
    await fireEvent.press(screen.getByText(`🔊 ${t('fr', 'diagTestVoice')}`));
    expect(mockSpeak).toHaveBeenCalledWith('Hello! Welcome to Kalam.', expect.objectContaining({ lang: 'en-US' }));
  });

  it('test du micro: affiche ce qui a été compris', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'hello kalam' });
    await show();
    await fireEvent.press(screen.getByText(`🎤 ${t('fr', 'diagTestMic')}`));
    expect(await screen.findByText(tf('fr', 'diagHeard', { text: 'hello kalam' }))).toBeTruthy();
    expect(mockListen).toHaveBeenCalledWith(expect.objectContaining({ lang: 'en-US' }));
    expect(mockStop.mock.invocationCallOrder[0]).toBeLessThan(mockListen.mock.invocationCallOrder[0]); // la voix est coupée avant d'écouter
  });

  it('test du micro en échec: explication du problème (refus, rien entendu…); annulation sans message', async () => {
    mockListen.mockResolvedValue({ ok: false, reason: 'permission-blocked' });
    await show();
    await fireEvent.press(screen.getByText(`🎤 ${t('fr', 'diagTestMic')}`));
    expect(await screen.findByText(t('fr', PROBLEM_TEXT['permission-blocked']))).toBeTruthy();
    mockListen.mockResolvedValue({ ok: false, reason: 'cancelled' });
    await fireEvent.press(screen.getByText(`🎤 ${t('fr', 'diagTestMic')}`));
    expect(screen.queryByText(t('fr', PROBLEM_TEXT['permission-blocked']))).toBeNull();
  });

  it('retour', async () => {
    const { onBack } = await show();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it.each(UI_LANGS)('fonctionne en %s (tous les textes existent)', async (lang) => {
    await show(deps(), lang);
    expect(screen.getByText(`✓ ${t(lang, 'diagAllOk')}`)).toBeTruthy();
    expect(screen.getByText(t(lang, 'diagServerOk'))).toBeTruthy();
    expect(t(lang, 'diagServerOk')).not.toBe('diagServerOk');
  });

  it('quitter pendant la vérification ne provoque aucune erreur', async () => {
    let release: (v: unknown) => void = () => {};
    const f = jest.fn().mockImplementation(() => new Promise((res) => { release = res; })) as unknown as typeof fetch;
    const view = await render(<ThemeProvider profileId="adult"><DiagnosticScreen lang="fr" onBack={jest.fn()} deps={deps({ fetchImpl: f })} /></ThemeProvider>);
    await act(async () => {});
    await view.unmount();
    await act(async () => { release({ ok: true, status: 200, json: async () => ({ ok: true, configured: true }) }); });
  });
});
