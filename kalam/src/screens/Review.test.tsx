import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { newCard } from '../domain/srs';
import { ThemeProvider } from '../theme/ThemeProvider';
import { UiLang } from '../i18n/strings';
import { ReviewScreen } from './ReviewScreen';

const mockSpeak = jest.fn();
jest.mock('../speech/tts', () => ({ tts: { speak: (...a: unknown[]) => mockSpeak(...a), stop: jest.fn(), hasVoice: async () => true } }));
jest.mock('../speech/recognizer', () => ({ isSpeechInputAvailable: () => false, cancelListening: jest.fn(), listenOnce: jest.fn() }));

const show = async (lang: UiLang, target: 'en' | 'fr', key: string) => {
  await render(<ThemeProvider profileId="adult"><ReviewScreen lang={lang} target={target} session={[newCard(key, 0)]} onAnswer={jest.fn()} onExit={jest.fn()} /></ThemeProvider>);
};

beforeEach(() => jest.clearAllMocks());

describe('ReviewScreen selon la langue apprise', () => {
  it('anglais (comportement historique): sens en français, réponse « menu »', async () => {
    await show('fr', 'en', 'restaurant:0');
    expect(screen.getByText('carte')).toBeTruthy();
    await fireEvent.press(screen.getByText('Voir la réponse'));
    expect(screen.getByText('menu')).toBeTruthy();
    expect(mockSpeak).toHaveBeenCalledWith('menu', expect.objectContaining({ lang: 'en-US' }));
  });
  it('français avec interface chinoise: sens en chinois, réponse « carte » lue avec une voix française', async () => {
    await show('zh', 'fr', 'fr:restaurant:0');
    expect(screen.getByText('菜单')).toBeTruthy();
    await fireEvent.press(screen.getByText('查看答案'));
    expect(screen.getByText('carte')).toBeTruthy();
    expect(mockSpeak).toHaveBeenCalledWith('carte', expect.objectContaining({ lang: 'fr-FR' }));
  });
  it('français avec interface française: le sens est donné en anglais (jamais le mot français lui-même)', async () => {
    await show('fr', 'fr', 'fr:restaurant:0');
    expect(screen.getByText('menu')).toBeTruthy();
    expect(screen.queryByText('carte')).toBeNull(); // la réponse n'est pas affichée avant « Voir la réponse »
  });
});
