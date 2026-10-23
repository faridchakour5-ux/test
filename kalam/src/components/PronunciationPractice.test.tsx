import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { PronunciationPractice } from './PronunciationPractice';
import { ThemeProvider } from '../theme/ThemeProvider';

const mockListen = jest.fn();
const mockStop = jest.fn();
const mockCancel = jest.fn();

jest.mock('../speech/tts', () => ({ tts: { stop: (...a: unknown[]) => mockStop(...a) } }));
jest.mock('../speech/recognizer', () => ({
  isSpeechInputAvailable: () => true,
  cancelListening: (...a: unknown[]) => mockCancel(...a),
  listenOnce: (...a: unknown[]) => mockListen(...a),
}));

const ui = (onResult?: () => void) => (
  <ThemeProvider profileId="adult">
    <PronunciationPractice lang="fr" expected="good morning" onResult={onResult} />
  </ThemeProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockStop.mockResolvedValue(undefined);
});

describe('PronunciationPractice', () => {
  it('écoute, évalue et rend le résultat', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'good morning' });
    const onResult = jest.fn();
    await render(ui(onResult));
    await fireEvent.press(screen.getByLabelText('Dis-le'));
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    expect(onResult.mock.calls[0][0].score).toBe(100);
    expect(mockStop.mock.invocationCallOrder[0]).toBeLessThan(mockListen.mock.invocationCallOrder[0]);
  });

  it('écran quitté pendant l\'arrêt de la voix: le micro ne s\'ouvre jamais', async () => {
    let releaseStop: () => void = () => {};
    mockStop.mockImplementation(() => new Promise<void>((r) => { releaseStop = r; }));
    const view = await render(ui());
    void fireEvent.press(screen.getByLabelText('Dis-le')); // pas d'await: la voix « s'arrête » encore
    await waitFor(() => expect(mockStop).toHaveBeenCalled());
    await view.unmount();
    await act(async () => { releaseStop(); });
    expect(mockListen).not.toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalled();
  });
});
