import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import { ChatScreen } from './ChatScreen';
import { ThemeProvider } from '../theme/ThemeProvider';
import { LESSONS } from '../domain/lessons';

const mockSpeak = jest.fn();
const mockStop = jest.fn();
const mockListen = jest.fn();
const mockAsk = jest.fn();

jest.mock('../speech/tts', () => ({
  tts: { speak: (...a: unknown[]) => mockSpeak(...a), stop: (...a: unknown[]) => mockStop(...a), hasVoice: async () => true },
}));
jest.mock('../speech/recognizer', () => ({
  isSpeechInputAvailable: () => true,
  cancelListening: jest.fn(),
  listenOnce: (...a: unknown[]) => mockListen(...a),
}));
jest.mock('../api/teacher', () => {
  const actual = jest.requireActual('../api/teacher');
  return { ...actual, askTeacher: (...a: unknown[]) => mockAsk(...a) };
});
jest.mock('../state/conversations', () => ({
  loadConversation: jest.fn(async () => []),
  saveConversation: jest.fn(async () => undefined),
  clearConversation: jest.fn(async () => undefined),
}));

import { TeacherError } from '../api/teacher';
import { loadConversation } from '../state/conversations';

const lesson = LESSONS.find((l) => l.id === 'restaurant')!;

async function setup() {
  const onFinish = jest.fn();
  const onBack = jest.fn();
  await render(
    <ThemeProvider profileId="adult">
      <ChatScreen lang="fr" lesson={lesson} level="A1" ageProfile="adult" onFinish={onFinish} onBack={onBack} />
    </ThemeProvider>,
  );
  await act(async () => {}); // laisse le chargement de la conversation se terminer
  return { onFinish, onBack };
}

const type = async (text: string) => {
  await fireEvent.changeText(screen.getByPlaceholderText('Écrivez en anglais…'), text);
  await fireEvent.press(screen.getByText('Envoyer'));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSpeak.mockResolvedValue('done');
  mockStop.mockResolvedValue(undefined);
  mockAsk.mockResolvedValue('Of course! What would you like?');
  (loadConversation as jest.Mock).mockResolvedValue([]);
});

describe('ChatScreen: saisie au clavier', () => {
  it('envoie le message, affiche la réponse et la lit à voix haute', async () => {
    await setup();
    await type('I would like water');
    await waitFor(() => expect(screen.getByText('Of course! What would you like?')).toBeTruthy());
    expect(screen.getByText('I would like water')).toBeTruthy();
    expect(mockAsk.mock.calls[0][0].messages).toEqual([{ role: 'user', content: 'I would like water' }]);
    expect(mockAsk.mock.calls[0][0].scenario).toBe(lesson.scenario);
    expect(mockSpeak).toHaveBeenCalledWith('Of course! What would you like?', expect.objectContaining({ lang: 'en-US' }));
  });

  it('n\'envoie rien si le champ est vide', async () => {
    await setup();
    await fireEvent.press(screen.getByText('Envoyer'));
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('recharge la conversation sauvegardée', async () => {
    (loadConversation as jest.Mock).mockResolvedValue([{ role: 'user', content: 'Hello again' }, { role: 'assistant', content: 'Welcome back!' }]);
    await setup();
    expect(screen.getByText('Hello again')).toBeTruthy();
    expect(screen.getByText('Welcome back!')).toBeTruthy();
  });
});

describe('ChatScreen: conversation vocale', () => {
  it('écoute, envoie ce qui a été dit, puis le professeur répond', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'I want some pizza' });
    await setup();
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(screen.getByText('Of course! What would you like?')).toBeTruthy());
    expect(mockAsk.mock.calls[0][0].messages.at(-1)).toEqual({ role: 'user', content: 'I want some pizza' });
    // La voix est coupée avant d'écouter: le micro ne capte jamais le professeur.
    expect(mockStop.mock.invocationCallOrder[0]).toBeLessThan(mockListen.mock.invocationCallOrder[0]);
  });

  it('passe la patience du profil au micro', async () => {
    mockListen.mockResolvedValue({ ok: false, reason: 'no-speech' });
    await setup();
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(mockListen).toHaveBeenCalled());
    expect(mockListen.mock.calls[0][0]).toMatchObject({ lang: 'en-US', patienceMs: 2200 });
  });

  it('rien entendu: message doux, aucun envoi', async () => {
    mockListen.mockResolvedValue({ ok: false, reason: 'no-speech' });
    await setup();
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(screen.getByText(/Je n'ai rien entendu/)).toBeTruthy());
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('micro bloqué: propose d\'ouvrir les réglages', async () => {
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    mockListen.mockResolvedValue({ ok: false, reason: 'permission-blocked' });
    await setup();
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(screen.getByText('Ouvrir les réglages')).toBeTruthy());
    await fireEvent.press(screen.getByText('Ouvrir les réglages'));
    expect(open).toHaveBeenCalled();
  });

  it('on ne peut pas relancer le micro pendant que le professeur parle', async () => {
    let finishSpeech: (v: string) => void = () => {};
    mockSpeak.mockImplementation(() => new Promise<string>((r) => { finishSpeech = r; }));
    mockListen.mockResolvedValue({ ok: true, transcript: 'Hello' });
    await setup();
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(screen.getByText('⏹ Arrêter la voix')).toBeTruthy());
    expect(screen.queryByText('🎤 Parler')).toBeNull();
    expect(mockListen).toHaveBeenCalledTimes(1);
    await act(async () => { finishSpeech('done'); });
    await waitFor(() => expect(screen.getByText('🎤 Parler')).toBeTruthy());
  });

  it('mains libres: après la réponse, le micro se relance tout seul', async () => {
    mockListen.mockResolvedValueOnce({ ok: true, transcript: 'Hello' }).mockResolvedValue({ ok: false, reason: 'no-speech' });
    await setup();
    await fireEvent(screen.getByLabelText('Conversation mains libres'), 'valueChange', true);
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(mockListen).toHaveBeenCalledTimes(2));
  });

  it('mains libres: s\'arrête après deux silences au lieu d\'écouter sans fin', async () => {
    mockListen.mockResolvedValue({ ok: false, reason: 'no-speech' });
    await setup();
    await fireEvent(screen.getByLabelText('Conversation mains libres'), 'valueChange', true);
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(screen.getByText(/Je n'ai rien entendu/)).toBeTruthy());
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(mockListen).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(mockListen).toHaveBeenCalledTimes(2);
  });
});

describe('ChatScreen: pannes réseau', () => {
  it('garde le message et permet de réessayer', async () => {
    mockAsk.mockRejectedValueOnce(new TeacherError('offline', true)).mockResolvedValueOnce('Back online!');
    await setup();
    await type('Hello teacher');
    await waitFor(() => expect(screen.getByText(/Pas de connexion/)).toBeTruthy());
    expect(screen.getByText('Hello teacher')).toBeTruthy(); // le message n'est pas perdu
    await fireEvent.press(screen.getByText('Réessayer'));
    await waitFor(() => expect(screen.getByText('Back online!')).toBeTruthy());
    expect(mockAsk).toHaveBeenCalledTimes(2);
    expect(mockAsk.mock.calls[1][0].messages).toEqual([{ role: 'user', content: 'Hello teacher' }]);
  });

  it('une panne de la voix ne bloque pas la conversation', async () => {
    mockSpeak.mockResolvedValue('error');
    mockListen.mockResolvedValue({ ok: true, transcript: 'Hi' });
    await setup();
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(screen.getByText('Of course! What would you like?')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('🎤 Parler')).toBeTruthy());
  });
});

describe('ChatScreen: sortie', () => {
  it('coupe la voix et le micro en quittant', async () => {
    const { onBack } = await setup();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(mockStop).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });
});
