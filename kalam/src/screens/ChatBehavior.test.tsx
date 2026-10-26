import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ChatScreen } from './ChatScreen';
import { ThemeProvider } from '../theme/ThemeProvider';
import { LESSONS } from '../domain/lessons';
import { TeacherError } from '../api/teacher';
import { PROBLEM_TEXT } from '../speech/problems';
import { t } from '../i18n/strings';
import { loadConversation } from '../state/conversations';

const mockSpeak = jest.fn();
const mockStop = jest.fn();
const mockListen = jest.fn();
const mockCancel = jest.fn();
const mockAsk = jest.fn();
let mockMic = true;
let mockHasVoice = true;

jest.mock('../speech/tts', () => ({
  tts: { speak: (...a: unknown[]) => mockSpeak(...a), stop: (...a: unknown[]) => mockStop(...a), hasVoice: async () => mockHasVoice },
}));
jest.mock('../speech/recognizer', () => ({
  isSpeechInputAvailable: () => mockMic,
  cancelListening: (...a: unknown[]) => mockCancel(...a),
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
jest.mock('../components/PronunciationPractice', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PronunciationPractice: ({ expected }: { expected: string }) => require('react').createElement(require('react-native').Text, null, `practice:${expected}`),
}));

const restaurant = LESSONS.find((l) => l.id === 'restaurant')!;
const EXISTING = [{ role: 'assistant' as const, content: 'Welcome! What would you like?' }];

type P = Partial<React.ComponentProps<typeof ChatScreen>>;
async function setup(p: P = {}) {
  const onFinish = jest.fn(); const onBack = jest.fn();
  const view = await render(
    <ThemeProvider profileId="adult">
      <ChatScreen target="en" lang="fr" lesson={restaurant} level="A1" ageProfile="adult" onFinish={onFinish} onBack={onBack} {...p} />
    </ThemeProvider>,
  );
  await act(async () => {});
  return { onFinish, onBack, view };
}
const type = async (text: string) => {
  await fireEvent.changeText(screen.getByPlaceholderText(t('fr', 'typeHere')), text);
  await fireEvent.press(screen.getByText(t('fr', 'send')));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMic = true; mockHasVoice = true;
  mockSpeak.mockResolvedValue('done');
  mockStop.mockResolvedValue(undefined);
  mockAsk.mockResolvedValue('Of course!');
  (loadConversation as jest.Mock).mockResolvedValue(EXISTING);
});
afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });

describe('conversation: fin et sortie', () => {
  it('« Terminer » compte au moins une minute, exactement les minutes écoulées sinon, et coupe voix et micro', async () => {
    let clock = 10_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    const { onFinish } = await setup();
    await type('Hello teacher'); // sans un seul message de l'apprenant, la séance ne compte pas (voir le test suivant)
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    mockCancel.mockClear(); mockStop.mockClear();
    await fireEvent.press(screen.getByText(t('fr', 'finish')));
    expect(onFinish).toHaveBeenLastCalledWith(1);
    expect(mockCancel).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
    clock += 3 * 60_000 + 10_000;
    await fireEvent.press(screen.getByText(t('fr', 'finish')));
    expect(onFinish).toHaveBeenLastCalledWith(3);
    clock += 40 * 60_000;
    await fireEvent.press(screen.getByText(t('fr', 'finish')));
    expect(onFinish).toHaveBeenLastCalledWith(43);
  });

  it('« Terminer » sans avoir rien dit: 0 minute (ni leçon réussie, ni série, ni points gagnés en ouvrant puis fermant)', async () => {
    const { onFinish } = await setup();
    await fireEvent.press(screen.getByText(t('fr', 'finish')));
    expect(onFinish).toHaveBeenLastCalledWith(0);
  });

  it('envoyer un message écrit PENDANT l\'écoute coupe le micro (il ne reste jamais ouvert derrière), puis la réponse suit', async () => {
    mockListen.mockImplementation(() => new Promise(() => {})); // l'écoute ne se termine pas d'elle-même
    await setup();
    await fireEvent.press(screen.getByText('🎤 Parler'));
    await waitFor(() => expect(screen.getByText(/Arrêter/)).toBeTruthy());
    mockCancel.mockClear(); mockStop.mockClear();
    await type('I changed my mind');
    expect(mockCancel).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockAsk.mock.calls[0][0].messages.at(-1)).toEqual({ role: 'user', content: 'I changed my mind' });
    expect(screen.queryByText(/Arrêter$/)).toBeNull();
  });

  it('« Retour » quitte sans compter de minutes et coupe voix et micro', async () => {
    const { onBack, onFinish } = await setup();
    mockCancel.mockClear();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalled();
  });

  it('réponse qui arrive après « Terminer »: ignorée (pas de texte, pas de voix)', async () => {
    let release: (v: string) => void = () => {};
    mockAsk.mockImplementation(() => new Promise<string>((res) => { release = res; }));
    await setup();
    void type('Hello there');
    await screen.findAllByText(t('fr', 'thinking'));
    await fireEvent.press(screen.getByText(t('fr', 'finish')));
    await act(async () => { release('Tard !'); });
    expect(screen.queryByText('Tard !')).toBeNull();
    expect(mockSpeak).not.toHaveBeenCalledWith('Tard !', expect.anything());
  });

  it('réponse qui arrive après la fermeture de l\'écran: aucun effet (ni voix, ni erreur)', async () => {
    let release: (v: string) => void = () => {};
    mockAsk.mockImplementation(() => new Promise<string>((res) => { release = res; }));
    const { view } = await setup();
    void type('Hello there');
    await screen.findAllByText(t('fr', 'thinking'));
    await view.unmount();
    await act(async () => { release('Trop tard'); });
    expect(mockSpeak).not.toHaveBeenCalledWith('Trop tard', expect.anything());
  });

  it('erreur qui arrive après la fermeture de l\'écran: ignorée', async () => {
    let fail: (e: unknown) => void = () => {};
    mockAsk.mockImplementation(() => new Promise<string>((_res, rej) => { fail = rej; }));
    const { view } = await setup();
    void type('Hello');
    await screen.findAllByText(t('fr', 'thinking'));
    await view.unmount();
    await act(async () => { fail(new TeacherError('offline', true)); });
    expect(screen.queryByText(t('fr', PROBLEM_TEXT.offline))).toBeNull();
  });
});

describe('conversation: affichage', () => {
  it('au repos, la ligne d\'état liste les mots clés de la leçon (en anglais)', async () => {
    await setup();
    expect(screen.getByText(restaurant.vocab.map((v) => v.en).join(' · '))).toBeTruthy();
    expect(screen.getByRole('header', { name: restaurant.title.fr })).toBeTruthy();
  });

  it('pendant l\'envoi: état « réflexion » et saisie verrouillée; une seconde saisie n\'envoie rien', async () => {
    mockAsk.mockImplementation(() => new Promise<string>(() => {}));
    await setup();
    void type('First');
    await waitFor(() => expect(screen.getByPlaceholderText(t('fr', 'typeHere'))).toHaveProp('editable', false));
    expect(screen.getAllByText(t('fr', 'thinking')).length).toBeGreaterThan(0);
    await fireEvent.changeText(screen.getByPlaceholderText(t('fr', 'typeHere')), 'Second');
    await fireEvent.press(screen.getByText(t('fr', 'send')));
    expect(mockAsk).toHaveBeenCalledTimes(1);
  });

  it('un message de plus de 500 caractères est coupé à 500 avant l\'envoi; les espaces autour sont retirés', async () => {
    await setup();
    await type(`  ${'a'.repeat(700)}  `);
    expect(mockAsk.mock.calls[0][0].messages.at(-1).content).toHaveLength(500);
    expect(mockAsk.mock.calls[0][0].messages.at(-1).content).toBe('a'.repeat(500));
  });

  it('seulement des espaces: rien n\'est envoyé', async () => {
    await setup();
    await type('     ');
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('la requête porte le profil, le niveau, la langue d\'interface, la langue apprise et au plus les 20 derniers messages', async () => {
    (loadConversation as jest.Mock).mockResolvedValue(Array.from({ length: 30 }, (_, i) => ({ role: i % 2 === 0 ? 'assistant' : 'user', content: `m${i}` })));
    await setup({ level: 'B1', ageProfile: 'senior', lang: 'es' });
    await fireEvent.changeText(screen.getByPlaceholderText(t('es', 'typeHere')), 'nuevo');
    await fireEvent.press(screen.getByText(t('es', 'send')));
    const req = mockAsk.mock.calls[0][0];
    expect(req).toMatchObject({ ageProfile: 'senior', level: 'B1', uiLang: 'es', targetLang: 'en', scenario: restaurant.scenario });
    expect(req.messages).toHaveLength(20);
    expect(req.messages.at(-1)).toEqual({ role: 'user', content: 'nuevo' });
    expect(req.messages[0].content).toBe('m11');
    expect(req.start).toBeUndefined();
  });

  it('chaque réponse du professeur a son bouton « Écouter » qui la relit', async () => {
    await setup();
    mockSpeak.mockClear();
    await fireEvent.press(screen.getByLabelText(t('fr', 'listen')));
    expect(mockSpeak).toHaveBeenCalledWith(EXISTING[0].content, expect.objectContaining({ lang: 'en-US' }));
  });

  it('avertissement quand aucune voix n\'est installée pour la langue apprise; rien sinon', async () => {
    mockHasVoice = false;
    await setup();
    expect(screen.getByText(/⚠/)).toBeTruthy();
    await cleanup();
    mockHasVoice = true;
    await setup();
    expect(screen.queryByText(/⚠/)).toBeNull();
  });

  it('sans reconnaissance vocale: pas de bouton micro ni de mains libres, la saisie reste possible', async () => {
    mockMic = false;
    await setup();
    expect(screen.queryByText(`🎤 ${t('fr', 'speak')}`)).toBeNull();
    expect(screen.queryByLabelText(t('fr', 'handsFree'))).toBeNull();
    await type('Hello');
    expect(mockAsk).toHaveBeenCalledTimes(1);
  });

  it('mains libres: l\'interrupteur change l\'état', async () => {
    await setup();
    const sw = screen.getByLabelText(t('fr', 'handsFree'));
    expect(sw).toHaveProp('value', false);
    await fireEvent(sw, 'valueChange', true);
    expect(screen.getByLabelText(t('fr', 'handsFree'))).toHaveProp('value', true);
  });
});

describe('conversation: écoute en direct', () => {
  it('« … » avant le premier mot, puis le texte provisoire au fil de la parole, puis plus rien', async () => {
    let partial: (s: string) => void = () => {};
    let finish: (v: unknown) => void = () => {};
    mockListen.mockImplementation((o: { onPartial: (s: string) => void }) => { partial = o.onPartial; return new Promise((res) => { finish = res; }); });
    await setup();
    await fireEvent.press(screen.getByText(`🎤 ${t('fr', 'speak')}`));
    expect(await screen.findByText('…')).toBeTruthy();
    expect(screen.getByText(`⏹ ${t('fr', 'stopBtn')}`)).toBeTruthy();
    await act(async () => { partial('I would'); });
    expect(screen.getByText('I would')).toBeTruthy();
    await act(async () => { partial('I would like water'); });
    expect(screen.getByText('I would like water')).toBeTruthy();
    await act(async () => { finish({ ok: false, reason: 'cancelled' }); });
    expect(screen.queryByText('I would like water')).toBeNull();
  });

  it('« Arrêter » pendant l\'écoute: micro coupé, retour au repos', async () => {
    mockListen.mockImplementation(() => new Promise(() => {}));
    await setup();
    await fireEvent.press(screen.getByText(`🎤 ${t('fr', 'speak')}`));
    await screen.findByText(`⏹ ${t('fr', 'stopBtn')}`);
    mockCancel.mockClear();
    await fireEvent.press(screen.getByText(`⏹ ${t('fr', 'stopBtn')}`));
    expect(mockCancel).toHaveBeenCalled();
    expect(await screen.findByText(`🎤 ${t('fr', 'speak')}`)).toBeTruthy();
  });

  it('texte provisoire reçu après la fermeture de l\'écran: ignoré', async () => {
    let partial: (s: string) => void = () => {};
    mockListen.mockImplementation((o: { onPartial: (s: string) => void }) => { partial = o.onPartial; return new Promise(() => {}); });
    const { view } = await setup();
    await fireEvent.press(screen.getByText(`🎤 ${t('fr', 'speak')}`));
    await screen.findByText('…');
    await view.unmount();
    await act(async () => { partial('trop tard'); });
    expect(screen.queryByText('trop tard')).toBeNull();
  });
});

describe('conversation: nouvel essai', () => {
  it('« Réessayer » seulement quand le dernier message est le nôtre (ou la conversation vide)', async () => {
    mockAsk.mockRejectedValue(new TeacherError('offline', true));
    await setup();
    await type('Hello');
    expect(await screen.findByText(t('fr', PROBLEM_TEXT.offline))).toBeTruthy();
    expect(screen.getByText(t('fr', 'retry'))).toBeTruthy();
    mockAsk.mockResolvedValueOnce('Back online!');
    await fireEvent.press(screen.getByText(t('fr', 'retry')));
    expect(await screen.findByText('Back online!')).toBeTruthy();
    expect(screen.queryByText(t('fr', PROBLEM_TEXT.offline))).toBeNull();
    expect(mockAsk.mock.calls.at(-1)![0].messages.at(-1)).toEqual({ role: 'user', content: 'Hello' });
  });

  it('erreur qui n\'est pas une erreur du professeur: traitée comme une panne serveur', async () => {
    mockAsk.mockRejectedValue(new Error('inattendu'));
    await setup();
    await type('Hello');
    expect(await screen.findByText(t('fr', PROBLEM_TEXT.server))).toBeTruthy();
  });

  it('chaque sorte de panne a son message', async () => {
    for (const kind of ['timeout', 'rate', 'server', 'config'] as const) {
      mockAsk.mockRejectedValue(new TeacherError(kind, kind !== 'config'));
      await setup();
      await type('Hello');
      expect(await screen.findByText(t('fr', PROBLEM_TEXT[kind]))).toBeTruthy();
      await cleanup();
    }
  });

  it('« invalid » est présenté comme une panne serveur', async () => {
    mockAsk.mockRejectedValue(new TeacherError('invalid', false));
    await setup();
    await type('Hello');
    expect(await screen.findByText(t('fr', PROBLEM_TEXT.server))).toBeTruthy();
    expect(screen.queryByText(t('fr', 'retry'))).toBeTruthy(); // le message est le nôtre: on peut renvoyer
  });
});

describe('conversation: panneau de pratique du vocabulaire', () => {
  it('replié au départ; déplier montre les mots, en choisir un le dit et lance l\'exercice; replier cache tout', async () => {
    await setup();
    expect(screen.queryByText(t('fr', 'practiceHint'))).toBeNull();
    const toggle = screen.getByText(new RegExp(`🎯 ${t('fr', 'practice')}`));
    await fireEvent.press(toggle);
    expect(screen.getByText(t('fr', 'practiceHint'))).toBeTruthy();
    const v = restaurant.vocab[1];
    const chip = screen.getByLabelText(`${v.en}, ${v.fr}`);
    expect(chip).toHaveProp('accessibilityState', { selected: false });
    mockSpeak.mockClear();
    await fireEvent.press(chip);
    expect(mockSpeak).toHaveBeenCalledWith(v.en, expect.objectContaining({ lang: 'en-US' }));
    expect(screen.getByText(`practice:${v.en}`)).toBeTruthy();
    expect(screen.getByLabelText(`${v.en}, ${v.fr}`)).toHaveProp('accessibilityState', { selected: true });
    expect(screen.getByLabelText(`${restaurant.vocab[0].en}, ${restaurant.vocab[0].fr}`)).toHaveProp('accessibilityState', { selected: false });
    await fireEvent.press(screen.getByText(new RegExp(`🎯 ${t('fr', 'practice')}`)));
    expect(screen.queryByText(t('fr', 'practiceHint'))).toBeNull();
  });

  it('ouvrir le panneau coupe l\'écoute et la voix en cours', async () => {
    await setup();
    mockCancel.mockClear(); mockStop.mockClear();
    await fireEvent.press(screen.getByText(new RegExp(`🎯 ${t('fr', 'practice')}`)));
    expect(mockCancel).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
  });

  it('en français, les mots proposés sont français', async () => {
    await setup({ target: 'fr' });
    await fireEvent.press(screen.getByText(new RegExp(`🎯 ${t('fr', 'practice')}`)));
    const v = restaurant.vocab[0];
    expect(screen.getByLabelText(new RegExp(`^${v.fr}, `))).toBeTruthy();
  });
});
