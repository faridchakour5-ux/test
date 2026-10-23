import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ChatScreen } from './ChatScreen';
import { ThemeProvider } from '../theme/ThemeProvider';
import { LESSONS } from '../domain/lessons';
import { TeacherError } from '../api/teacher';
import { loadConversation, saveConversation } from '../state/conversations';

const mockPush = jest.fn();
const mockEnd = jest.fn();
const mockStop = jest.fn();
const mockStream = jest.fn();
const mockListen = jest.fn();

jest.mock('../speech/tts', () => ({
  tts: {
    speak: jest.fn(async () => 'done'),
    speakStream: () => ({ push: (...a: unknown[]) => mockPush(...a), end: () => mockEnd() }),
    stop: (...a: unknown[]) => mockStop(...a),
    hasVoice: async () => true,
  },
}));
jest.mock('../speech/recognizer', () => ({
  isSpeechInputAvailable: () => true,
  cancelListening: jest.fn(),
  listenOnce: (...a: unknown[]) => mockListen(...a),
}));
jest.mock('../api/teacher', () => {
  const actual = jest.requireActual('../api/teacher');
  return { ...actual, streamingEnabled: () => true, askTeacher: jest.fn(), askTeacherStream: (...a: unknown[]) => mockStream(...a) };
});
jest.mock('../state/conversations', () => ({
  loadConversation: jest.fn(async () => []),
  saveConversation: jest.fn(async () => undefined),
  clearConversation: jest.fn(async () => undefined),
  loadTopicId: jest.fn(async () => null),
  saveTopicId: jest.fn(async () => undefined),
}));

const lesson = LESSONS.find((l) => l.id === 'restaurant')!;
type OnDelta = { onDelta: (d: string) => void; signal?: AbortSignal };

async function setup() {
  await render(
    <ThemeProvider profileId="adult">
      <ChatScreen lang="fr" lesson={lesson} level="A1" ageProfile="adult" onFinish={jest.fn()} onBack={jest.fn()} />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const type = async (text: string) => {
  await fireEvent.changeText(screen.getByPlaceholderText('Écrivez votre message…'), text);
  await fireEvent.press(screen.getByText('Envoyer'));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEnd.mockResolvedValue('done');
  mockStop.mockResolvedValue(undefined);
  (loadConversation as jest.Mock).mockResolvedValue([{ role: 'assistant', content: 'Welcome!' }]);
});

describe('ChatScreen en mode flux', () => {
  it('affiche le texte au fil de l\'eau et lance la voix AVANT la fin de la réponse', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    mockStream.mockImplementation(async (_req: unknown, o: OnDelta) => {
      o.onDelta('Of course! We have ');
      o.onDelta('fresh fish today. ');
      await gate; // le serveur n'a pas fini
      o.onDelta('Would you like some?');
      return { text: 'Of course! We have fresh fish today. Would you like some?', partial: false };
    });
    await setup();
    await type('I am hungry');

    // En plein flux: texte partiel visible, 1re phrase déjà envoyée à la voix, réponse pas terminée.
    await waitFor(() => expect(screen.getByText('Of course! We have fresh fish today. ')).toBeTruthy());
    // « Of course! » est trop court pour être lu seul: il est regroupé avec la phrase suivante.
    expect(mockPush).toHaveBeenCalledWith('Of course! We have fresh fish today.');
    expect(mockEnd).not.toHaveBeenCalled();
    expect(screen.getByText('⏹ Arrêter la voix')).toBeTruthy();

    await act(async () => { release(); });
    await waitFor(() => expect(screen.getByText('Of course! We have fresh fish today. Would you like some?')).toBeTruthy());
    expect(mockPush).toHaveBeenLastCalledWith('Would you like some?'); // le reste est lu à la fin
    await waitFor(() => expect(screen.getByText('🎤 Parler')).toBeTruthy()); // revenu au repos
    // un seul message assistant a été construit (pas un par morceau)
    expect(screen.getAllByText(/Of course!/)).toHaveLength(1);
  });

  it('le professeur ouvre la conversation en flux', async () => {
    (loadConversation as jest.Mock).mockResolvedValue([]);
    mockStream.mockImplementation(async (_req: unknown, o: OnDelta) => { o.onDelta('Hello and welcome to our restaurant! '); return { text: 'x', partial: false }; });
    await setup();
    await waitFor(() => expect(screen.getByText(/Hello and welcome/)).toBeTruthy());
    expect(mockStream.mock.calls[0][0]).toMatchObject({ start: true, messages: [] });
  });

  it('erreur avant le premier morceau: message clair et « Réessayer » qui relance le flux', async () => {
    mockStream.mockRejectedValueOnce(new TeacherError('offline', true)).mockImplementationOnce(async (_r: unknown, o: OnDelta) => { o.onDelta('Back online!'); return { text: 'Back online!', partial: false }; });
    await setup();
    await type('Hello');
    await waitFor(() => expect(screen.getByText(/Pas de connexion/)).toBeTruthy());
    await fireEvent.press(screen.getByText('Réessayer'));
    await waitFor(() => expect(screen.getByText('Back online!')).toBeTruthy());
    expect(mockStream).toHaveBeenCalledTimes(2);
  });

  it('interrompre la voix en plein flux: la réponse cesse de grandir', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    mockStream.mockImplementation(async (_req: unknown, o: OnDelta) => {
      o.onDelta('First part of the answer. ');
      await gate;
      o.onDelta('LATE TEXT');
      return { text: 'x', partial: false };
    });
    await setup();
    await type('Tell me more');
    await waitFor(() => expect(screen.getByText('⏹ Arrêter la voix')).toBeTruthy());
    await fireEvent.press(screen.getByText('⏹ Arrêter la voix'));
    expect(mockStop).toHaveBeenCalled();
    await act(async () => { release(); });
    expect(screen.queryByText(/LATE TEXT/)).toBeNull();
    expect(screen.getByText('🎤 Parler')).toBeTruthy();
  });

  it('le mode mains libres fonctionne aussi en flux (réécoute après la réponse)', async () => {
    mockListen.mockResolvedValueOnce({ ok: true, transcript: 'Hello' }).mockResolvedValue({ ok: false, reason: 'no-speech' });
    mockStream.mockImplementation(async (_r: unknown, o: OnDelta) => { o.onDelta('Nice to meet you, friend. '); return { text: 'x', partial: false }; });
    await setup();
    await fireEvent(screen.getByLabelText('Conversation mains libres'), 'valueChange', true);
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(mockListen).toHaveBeenCalledTimes(2));
  });

  it('interrompre la voix annule la requête réseau (plus de jetons gaspillés)', async () => {
    let signal: AbortSignal | undefined;
    mockStream.mockImplementation(async (_req: unknown, o: OnDelta) => {
      signal = o.signal;
      o.onDelta('A long answer is starting now. ');
      await new Promise(() => {}); // ne se termine jamais: seule l'annulation peut l'arrêter
    });
    await setup();
    await type('Tell me a story');
    await waitFor(() => expect(screen.getByText('⏹ Arrêter la voix')).toBeTruthy());
    expect(signal?.aborted).toBe(false);
    await fireEvent.press(screen.getByText('⏹ Arrêter la voix'));
    expect(signal?.aborted).toBe(true);
  });

  it('quitter l\'écran annule la requête en cours', async () => {
    let signal: AbortSignal | undefined;
    mockStream.mockImplementation(async (_req: unknown, o: OnDelta) => { signal = o.signal; await new Promise(() => {}); });
    await setup();
    await type('Hello there');
    await waitFor(() => expect(signal).toBeDefined());
    await fireEvent.press(screen.getByText(/Retour/));
    expect(signal?.aborted).toBe(true);
  });

  it('regroupe les sauvegardes: des dizaines de morceaux de texte ne provoquent pas des dizaines d\'écritures', async () => {
    mockStream.mockImplementation(async (_req: unknown, o: OnDelta) => {
      // morceaux espacés comme sur un vrai réseau (sinon React les fusionne déjà en un seul affichage)
      for (let i = 0; i < 40; i++) { o.onDelta(`word${i} `); await new Promise((r) => setTimeout(r, 4)); }
      return { text: 'x', partial: false };
    });
    await setup();
    await type('Tell me a long story');
    await waitFor(() => expect(screen.getByText(/word39/)).toBeTruthy());
    await waitFor(() => expect((saveConversation as jest.Mock).mock.calls.length).toBeGreaterThan(0), { timeout: 3000 });
    const calls = (saveConversation as jest.Mock).mock.calls;
    expect(calls.length).toBeLessThanOrEqual(4); // 40 morceaux, mais très peu d'écritures
    const last = calls[calls.length - 1][1] as { role: string; content: string }[];
    expect(last[last.length - 1].content).toContain('word39'); // la dernière version est bien celle qui est sauvegardée
  });

  it('quitter l\'écran sauvegarde tout de suite la dernière version (rien n\'est perdu)', async () => {
    mockStream.mockImplementation(async (_req: unknown, o: OnDelta) => { o.onDelta('A quick answer. '); return { text: 'x', partial: false }; });
    await setup();
    (saveConversation as jest.Mock).mockClear();
    await type('Hello');
    await waitFor(() => expect(screen.getByText(/A quick answer/)).toBeTruthy());
    await screen.unmount(); // l'écran se ferme bien avant les 500 ms du regroupement
    const calls = (saveConversation as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const last = calls[calls.length - 1][1] as { content: string }[];
    expect(last.map((m) => m.content).join(' ')).toContain('A quick answer');
  });
});
