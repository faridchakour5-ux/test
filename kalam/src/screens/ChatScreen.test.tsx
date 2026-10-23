import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import { ChatScreen } from './ChatScreen';
import { ThemeProvider } from '../theme/ThemeProvider';
import { LESSONS } from '../domain/lessons';
import { duoLesson } from '../domain/duo';
import { TeacherError } from '../api/teacher';
import { loadConversation, loadTopicId, saveTopicId } from '../state/conversations';

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
  loadTopicId: jest.fn(async () => null),
  saveTopicId: jest.fn(async () => undefined),
}));

const lesson = LESSONS.find((l) => l.id === 'restaurant')!;

async function setup(lessonId = 'restaurant', target: 'en' | 'fr' = 'en') {
  const onFinish = jest.fn();
  const onBack = jest.fn();
  await render(
    <ThemeProvider profileId="adult">
      <ChatScreen target={target} lang="fr" lesson={LESSONS.find((l) => l.id === lessonId) ?? lesson} level="A1" ageProfile="adult" onFinish={onFinish} onBack={onBack} />
    </ThemeProvider>,
  );
  await act(async () => {}); // laisse le chargement de la conversation se terminer
  return { onFinish, onBack };
}

const type = async (text: string) => {
  await fireEvent.changeText(screen.getByPlaceholderText('Écrivez votre message…'), text);
  await fireEvent.press(screen.getByText('Envoyer'));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSpeak.mockResolvedValue('done');
  mockStop.mockResolvedValue(undefined);
  mockAsk.mockResolvedValue('Of course! What would you like?');
  // Par défaut la conversation existe déjà (le professeur a déjà ouvert la scène).
  (loadConversation as jest.Mock).mockResolvedValue([{ role: 'assistant', content: 'Welcome! What would you like?' }]);
});

describe('ChatScreen: saisie au clavier', () => {
  it('envoie le message, affiche la réponse et la lit à voix haute', async () => {
    await setup();
    await type('I would like water');
    await waitFor(() => expect(screen.getByText('Of course! What would you like?')).toBeTruthy());
    expect(screen.getByText('I would like water')).toBeTruthy();
    expect(mockAsk.mock.calls[0][0].messages.at(-1)).toEqual({ role: 'user', content: 'I would like water' });
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
    expect(mockAsk.mock.calls[1][0].messages.at(-1)).toEqual({ role: 'user', content: 'Hello teacher' });
  });

  it('mauvaise configuration du serveur: message clair et pas de « Réessayer » inutile', async () => {
    mockAsk.mockRejectedValueOnce(new TeacherError('config', false));
    await setup();
    await type('Hello');
    await waitFor(() => expect(screen.getByText(/n'est pas configurée correctement/)).toBeTruthy());
    expect(screen.queryByText('Réessayer')).toBeNull();
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

describe('ChatScreen: ouverture par le professeur', () => {
  it('le professeur ouvre une conversation vide et sa phrase est lue', async () => {
    (loadConversation as jest.Mock).mockResolvedValue([]);
    mockAsk.mockResolvedValue('Hello! Welcome to our restaurant. What would you like?');
    await setup();
    await waitFor(() => expect(screen.getByText(/Welcome to our restaurant/)).toBeTruthy());
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(mockAsk.mock.calls[0][0]).toMatchObject({ start: true, messages: [] });
    expect(mockSpeak).toHaveBeenCalledWith(expect.stringContaining('Welcome to our restaurant'), expect.anything());
  });

  it('ne rouvre pas une conversation déjà commencée', async () => {
    await setup();
    await act(async () => {});
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('si l\'ouverture échoue, on peut réessayer', async () => {
    (loadConversation as jest.Mock).mockResolvedValue([]);
    mockAsk.mockRejectedValueOnce(new TeacherError('offline', true)).mockResolvedValueOnce('Hi there!');
    await setup();
    await waitFor(() => expect(screen.getByText(/Pas de connexion/)).toBeTruthy());
    await fireEvent.press(screen.getByText('Réessayer'));
    await waitFor(() => expect(screen.getByText('Hi there!')).toBeTruthy());
    expect(mockAsk).toHaveBeenCalledTimes(2);
  });

  it('« Nouvelle conversation » efface l\'historique et le professeur rouvre', async () => {
    mockAsk.mockResolvedValue('Fresh start! Hello!');
    await setup();
    await fireEvent.press(screen.getByText('Nouvelle conversation'));
    await waitFor(() => expect(screen.getByText('Fresh start! Hello!')).toBeTruthy());
    expect(screen.queryByText('Welcome! What would you like?')).toBeNull();
    expect(mockAsk.mock.calls[0][0]).toMatchObject({ start: true, messages: [] });
  });
});

describe('ChatScreen: pratique de la prononciation', () => {
  it('affiche les mots clés de la leçon, en lit un et propose de le dire', async () => {
    await setup();
    expect(screen.queryByText('menu')).toBeNull();
    await fireEvent.press(screen.getByText(/Pratiquer les mots clés/));
    expect(screen.getByText('menu')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('menu, carte'));
    expect(mockSpeak).toHaveBeenCalledWith('menu', expect.objectContaining({ lang: 'en-US' }));
    // le mot choisi est affiché avec son bouton « Dis-le » (micro disponible dans ce test)
    await waitFor(() => expect(screen.getByText(/Dis-le/)).toBeTruthy());
  });
});

describe('ChatScreen: parle librement (choix du sujet)', () => {
  beforeEach(() => {
    (loadConversation as jest.Mock).mockResolvedValue([]);
    (loadTopicId as jest.Mock).mockResolvedValue(null);
  });

  it('propose les sujets et n\'appelle PAS le professeur avant le choix', async () => {
    await setup('free');
    expect(screen.getByText('De quoi veux-tu parler ?')).toBeTruthy();
    expect(screen.getByLabelText('Voyages')).toBeTruthy();
    await act(async () => {});
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('après le choix, le professeur ouvre avec le scénario du sujet, qui est mémorisé', async () => {
    mockAsk.mockResolvedValue('Tell me about your best trip!');
    await setup('free');
    await fireEvent.press(screen.getByLabelText('Voyages'));
    await waitFor(() => expect(screen.getByText('Tell me about your best trip!')).toBeTruthy());
    expect(mockAsk.mock.calls[0][0]).toMatchObject({ start: true, scenario: expect.stringContaining('travel') });
    expect(saveTopicId).toHaveBeenCalledWith('free', 'travel');
    expect(screen.queryByText('De quoi veux-tu parler ?')).toBeNull(); // le choix disparaît
  });

  it('reprend une conversation avec son sujet sans redemander', async () => {
    (loadConversation as jest.Mock).mockResolvedValue([{ role: 'assistant', content: 'Where did you go?' }]);
    (loadTopicId as jest.Mock).mockResolvedValue('food');
    await setup('free');
    expect(screen.queryByText('De quoi veux-tu parler ?')).toBeNull();
    await type('I love pasta');
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockAsk.mock.calls[0][0].scenario).toContain('food');
  });

  it('« Nouvelle conversation » repropose le choix du sujet sans relancer le professeur', async () => {
    (loadConversation as jest.Mock).mockResolvedValue([{ role: 'assistant', content: 'Hi!' }]);
    (loadTopicId as jest.Mock).mockResolvedValue('work');
    await setup('free');
    await fireEvent.press(screen.getByText('Nouvelle conversation'));
    await waitFor(() => expect(screen.getByText('De quoi veux-tu parler ?')).toBeTruthy());
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('les autres leçons n\'affichent jamais ce choix', async () => {
    (loadConversation as jest.Mock).mockResolvedValue([{ role: 'assistant', content: 'Welcome!' }]);
    await setup('restaurant');
    expect(screen.queryByText('De quoi veux-tu parler ?')).toBeNull();
  });
});

describe('ChatScreen: conversation à deux', () => {
  async function setupDuo() {
    await render(
      <ThemeProvider profileId="adult">
        <ChatScreen duo={{ names: ['Sara', 'Léo'] }} lang="fr" lesson={duoLesson('Sara', 'Léo', null)} level="A1" ageProfile="adult" onFinish={jest.fn()} onBack={jest.fn()} />
      </ThemeProvider>,
    );
    await act(async () => {});
  }
  beforeEach(() => {
    (loadConversation as jest.Mock).mockResolvedValue([{ role: 'assistant', content: 'Welcome Sara and Léo!' }]);
  });

  it('étiquette chaque message avec le prénom de qui parle, et passe le tour à l\'autre', async () => {
    mockAsk.mockResolvedValue('Nice! Léo, what do you think?');
    await setupDuo();
    await type('I like pizza');
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockAsk.mock.calls[0][0].messages.at(-1)).toEqual({ role: 'user', content: '[Sara] I like pizza' });
    // le tour est passé à Léo
    await waitFor(() => expect(screen.getByLabelText('Au tour de Léo')).toHaveProp('accessibilityState', { checked: true }));
    await type('Me too');
    await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(2));
    expect(mockAsk.mock.calls[1][0].messages.at(-1)).toEqual({ role: 'user', content: '[Léo] Me too' });
  });

  it('affiche le prénom au-dessus du message, sans montrer les crochets', async () => {
    await setupDuo();
    await type('Hello everybody');
    await waitFor(() => expect(screen.getByText('Hello everybody')).toBeTruthy());
    // « Sara » apparaît sur l'étiquette du message ET dans le sélecteur de tour
    expect(screen.getAllByText('Sara').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('[Sara] Hello everybody')).toBeNull();
    expect(screen.queryByText(/\[Sara\]/)).toBeNull();
  });

  it('on peut changer qui parle avant d\'envoyer', async () => {
    await setupDuo();
    await fireEvent.press(screen.getByLabelText('Au tour de Léo'));
    await type('I am Léo');
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockAsk.mock.calls[0][0].messages.at(-1).content).toBe('[Léo] I am Léo');
  });

  it('envoie au professeur la consigne à deux (scénario) et reste sous la limite du serveur', async () => {
    await setupDuo();
    await type('Hi');
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    const req = mockAsk.mock.calls[0][0];
    expect(req.scenario).toContain('Sara');
    expect(req.scenario).toContain('Léo');
    expect(req.scenario.length).toBeLessThanOrEqual(300);
  });

  it('un très long message reste sous la limite de 500 caractères avec l\'étiquette', async () => {
    await setupDuo();
    await type('x'.repeat(500));
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockAsk.mock.calls[0][0].messages.at(-1).content.length).toBeLessThanOrEqual(500);
  });

  it('en mode vocal, ce qui est dit est aussi étiqueté', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'I want to travel' });
    await setupDuo();
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockAsk.mock.calls[0][0].messages.at(-1).content).toBe('[Sara] I want to travel');
  });

  it('pas de panneau de vocabulaire (aucun mot clé en mode à deux)', async () => {
    await setupDuo();
    expect(screen.queryByText(/Pratiquer les mots clés/)).toBeNull();
  });

  it('hors mode à deux, aucun sélecteur de tour ni étiquette', async () => {
    (loadConversation as jest.Mock).mockResolvedValue([{ role: 'assistant', content: 'Welcome!' }]);
    await setup('restaurant');
    expect(screen.queryByLabelText('Au tour de Sara')).toBeNull();
    await type('Hello');
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockAsk.mock.calls[0][0].messages.at(-1).content).toBe('Hello');
  });
});

describe('ChatScreen: apprendre le français', () => {
  beforeEach(() => {
    (loadConversation as jest.Mock).mockResolvedValue([{ role: 'assistant', content: 'Bonjour ! Que désirez-vous ?' }]);
  });

  it('demande au professeur de parler français et lit sa réponse avec une voix française', async () => {
    mockAsk.mockResolvedValue('Très bien ! Une carte ?');
    await setup('restaurant', 'fr');
    await type('Je voudrais de l\'eau');
    await waitFor(() => expect(screen.getByText('Très bien ! Une carte ?')).toBeTruthy());
    expect(mockAsk.mock.calls[0][0]).toMatchObject({ targetLang: 'fr' });
    expect(mockSpeak).toHaveBeenCalledWith('Très bien ! Une carte ?', expect.objectContaining({ lang: 'fr-FR' }));
  });

  it('écoute le micro en français', async () => {
    mockListen.mockResolvedValue({ ok: true, transcript: 'Bonjour madame' });
    await setup('restaurant', 'fr');
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockListen.mock.calls[0][0]).toMatchObject({ lang: 'fr-FR' });
  });

  it('les mots clés sont les mots FRANÇAIS de la leçon, avec leur sens', async () => {
    await setup('restaurant', 'fr');
    await fireEvent.press(screen.getByText(/Pratiquer les mots clés/));
    expect(screen.getAllByText('carte').length).toBeGreaterThan(0); // « menu » en français
    expect(screen.queryByText('menu')).toBeTruthy(); // le sens (interface en français → sens en anglais)
    await fireEvent.press(screen.getByLabelText('carte, menu'));
    expect(mockSpeak).toHaveBeenCalledWith('carte', expect.objectContaining({ lang: 'fr-FR' }));
  });

  it('l\'anglais reste inchangé: requête targetLang en et voix en-US', async () => {
    (loadConversation as jest.Mock).mockResolvedValue([{ role: 'assistant', content: 'Welcome!' }]);
    await setup('restaurant', 'en');
    await type('Hello');
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockAsk.mock.calls[0][0]).toMatchObject({ targetLang: 'en' });
  });

  it('le professeur ouvre la scène en français', async () => {
    (loadConversation as jest.Mock).mockResolvedValue([]);
    mockAsk.mockResolvedValue('Bonjour et bienvenue !');
    await setup('restaurant', 'fr');
    await waitFor(() => expect(screen.getByText('Bonjour et bienvenue !')).toBeTruthy());
    expect(mockAsk.mock.calls[0][0]).toMatchObject({ start: true, targetLang: 'fr' });
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
