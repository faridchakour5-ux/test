import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { newCard } from '../domain/srs';
import { ANSWER_QUALITY } from '../domain/deck';
import { t } from '../i18n/strings';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ReviewScreen } from './ReviewScreen';

const mockSpeak = jest.fn();
jest.mock('../speech/tts', () => ({ tts: { speak: (...a: unknown[]) => mockSpeak(...a), stop: jest.fn(), hasVoice: async () => true } }));
jest.mock('../components/PronunciationPractice', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PronunciationPractice: ({ expected }: { expected: string }) => require('react').createElement(require('react-native').Text, null, `practice:${expected}`),
}));

// restaurant:0 = menu / carte, restaurant:1 = I would like / Je voudrais, family:0 = mother / mère
const session = () => [newCard('restaurant:0', 0), newCard('restaurant:1', 0), newCard('family:0', 0)];
const show = (over: Partial<React.ComponentProps<typeof ReviewScreen>> = {}) => render(
  <ThemeProvider profileId="adult">
    <ReviewScreen lang="fr" session={session()} onAnswer={jest.fn()} onExit={jest.fn()} {...over} />
  </ThemeProvider>,
);
const reveal = async () => { await fireEvent.press(screen.getByText(t('fr', 'reveal'))); };

beforeEach(() => jest.clearAllMocks());
afterEach(async () => { await cleanup(); });

describe('séance de révision', () => {
  it('première carte: numérotation, sens en français, réponse cachée', async () => {
    await show();
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByText('carte')).toBeTruthy();
    expect(screen.queryByText('menu')).toBeNull();
    expect(screen.queryByText(t('fr', 'howWell'))).toBeNull();
    expect(screen.queryByText(t('fr', 'again'))).toBeNull();
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('« Voir la réponse »: la réponse apparaît, est lue à voix haute, les quatre boutons d\'évaluation et l\'exercice de prononciation apparaissent', async () => {
    await show();
    await reveal();
    expect(screen.getByText('menu')).toBeTruthy();
    expect(mockSpeak).toHaveBeenCalledWith('menu', expect.objectContaining({ lang: 'en-US' }));
    expect(screen.getByText(t('fr', 'howWell'))).toBeTruthy();
    for (const k of ['again', 'hard', 'good', 'easy'] as const) expect(screen.getByText(t('fr', k))).toBeTruthy();
    expect(screen.queryByText(t('fr', 'reveal'))).toBeNull();
    expect(screen.getByText('practice:menu')).toBeTruthy();
  });

  it('« Écouter » relit la réponse', async () => {
    await show();
    await reveal();
    mockSpeak.mockClear();
    await fireEvent.press(screen.getByLabelText(t('fr', 'listen')));
    expect(mockSpeak).toHaveBeenCalledWith('menu', expect.anything());
  });

  it('chaque réponse envoie la bonne qualité pour la bonne carte, puis passe à la suivante, réponse recachée', async () => {
    const onAnswer = jest.fn();
    await show({ onAnswer });
    const plan: [string, 'again' | 'hard' | 'good', string, string][] = [
      ['restaurant:0', 'again', '2/3', 'Je voudrais'],
      ['restaurant:1', 'hard', '3/3', 'mère'],
    ];
    for (const [key, ans, nextNumber, nextMeaning] of plan) {
      await reveal();
      await fireEvent.press(screen.getByText(t('fr', ans)));
      expect(onAnswer).toHaveBeenLastCalledWith(key, ANSWER_QUALITY[ans]);
      expect(screen.getByText(nextNumber)).toBeTruthy();
      expect(screen.getByText(nextMeaning)).toBeTruthy();
      expect(screen.getByText(t('fr', 'reveal'))).toBeTruthy(); // la réponse est recachée
      expect(screen.queryByText(t('fr', 'howWell'))).toBeNull();
    }
    await reveal();
    await fireEvent.press(screen.getByText(t('fr', 'easy')));
    expect(onAnswer).toHaveBeenLastCalledWith('family:0', 5);
    expect(onAnswer.mock.calls.map((c) => c[1])).toEqual([1, 3, 5]);
  });

  it('qualités exactes: « à revoir » 1, « difficile » 3, « bien » 4, « facile » 5', () => {
    expect(ANSWER_QUALITY).toEqual({ again: 1, hard: 3, good: 4, easy: 5 });
  });

  it('fin de séance: seules les réponses « bien » et « facile » comptent comme réussies', async () => {
    const onExit = jest.fn();
    await show({ onExit });
    for (const ans of ['good', 'easy', 'hard'] as const) {
      await reveal();
      await fireEvent.press(screen.getByText(t('fr', ans)));
    }
    expect(screen.getByText(`${t('fr', 'reviewDone')} 2/3`)).toBeTruthy();
    expect(screen.queryByText(t('fr', 'reveal'))).toBeNull();
    await fireEvent.press(screen.getAllByText(t('fr', 'back')).pop()!);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('tout raté: 0/3, tout réussi: 3/3', async () => {
    await show();
    for (let i = 0; i < 3; i++) { await reveal(); await fireEvent.press(screen.getByText(t('fr', 'again'))); }
    expect(screen.getByText(`${t('fr', 'reviewDone')} 0/3`)).toBeTruthy();
    await cleanup();
    await show();
    for (let i = 0; i < 3; i++) { await reveal(); await fireEvent.press(screen.getByText(t('fr', 'good'))); }
    expect(screen.getByText(`${t('fr', 'reviewDone')} 3/3`)).toBeTruthy();
  });

  it('rien à réviser: message dédié, aucun score, retour possible', async () => {
    const onExit = jest.fn();
    await show({ session: [], onExit });
    expect(screen.getByText(t('fr', 'nothingToReview'))).toBeTruthy();
    expect(screen.queryByText(new RegExp(t('fr', 'reviewDone')))).toBeNull();
    expect(screen.queryByText(t('fr', 'reveal'))).toBeNull();
    await fireEvent.press(screen.getAllByText(t('fr', 'back')).pop()!);
    expect(onExit).toHaveBeenCalled();
  });

  it('la séance est figée au départ: répondre ne la modifie pas, un nouveau paramètre ne la remplace pas', async () => {
    const view = await show();
    await view.rerender(
      <ThemeProvider profileId="adult"><ReviewScreen lang="fr" session={[newCard('family:0', 0)]} onAnswer={jest.fn()} onExit={jest.fn()} /></ThemeProvider>,
    );
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByText('carte')).toBeTruthy();
  });

  it('bouton « Retour » en haut: quitte à tout moment, sans enregistrer de réponse', async () => {
    const onExit = jest.fn(); const onAnswer = jest.fn();
    await show({ onExit, onAnswer });
    await fireEvent.press(screen.getByText(/← /));
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('une carte dont le mot a disparu du catalogue ne plante pas l\'écran', async () => {
    await show({ session: [newCard('inconnue:99', 0)] });
    expect(screen.getByText('1/1')).toBeTruthy();
    await reveal();
    expect(screen.getByText(t('fr', 'howWell'))).toBeTruthy();
    expect(screen.queryByText(/^practice:/)).toBeNull();
  });
});
