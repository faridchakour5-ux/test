import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { KIDS_TOPICS, STORIES, buildRounds } from '../domain/kids';
import { pick, t } from '../i18n/strings';
import { ThemeProvider } from '../theme/ThemeProvider';
import { PlayScreen } from './PlayScreen';
import { StoryScreen } from './StoryScreen';

const mockSpeak = jest.fn();
const mockStop = jest.fn();
jest.mock('../speech/tts', () => ({ tts: { speak: (...a: unknown[]) => mockSpeak(...a), stop: (...a: unknown[]) => mockStop(...a), hasVoice: async () => true } }));
jest.mock('../components/PronunciationPractice', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PronunciationPractice: ({ expected }: { expected: string }) => require('react').createElement(require('react-native').Text, null, `practice:${expected}`),
}));

const topic = KIDS_TOPICS[0];
const items = topic.items; // avec Math.random à ~1, aucun mélange: manche k = items[k], choix [items[k], items[k+1], items[k+2]]
const label = (i: number, lang: 'fr' | 'en' = 'fr') => pick(items[i], lang);

type PlayProps = Partial<React.ComponentProps<typeof PlayScreen>>;
const play = (p: PlayProps = {}) => render(
  <ThemeProvider profileId="kids">
    <PlayScreen lang="fr" stars={0} micAllowed={false} onCorrect={jest.fn()} onExit={jest.fn()} {...p} />
  </ThemeProvider>,
);
const startTopic = async () => { await fireEvent.press(screen.getByLabelText(topic.title.fr)); };

beforeEach(() => { jest.clearAllMocks(); jest.spyOn(Math, 'random').mockReturnValue(0.999999); });
afterEach(async () => { await cleanup(); jest.useRealTimers(); jest.restoreAllMocks(); });

describe('PlayScreen (jeu des enfants)', () => {
  it('propose tous les thèmes; « retour » quitte sans compter de temps', async () => {
    const onExit = jest.fn();
    await play({ onExit });
    for (const tp of KIDS_TOPICS) expect(screen.getByLabelText(tp.title.fr)).toBeTruthy();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(onExit).toHaveBeenCalledWith(0);
  });

  it('une manche: numérotation, trois choix, le mot est dit en anglais', async () => {
    await play();
    await startTopic();
    expect(screen.getByText('1/5')).toBeTruthy();
    expect(screen.getByText(t('fr', 'whichOne'))).toBeTruthy();
    for (const i of [0, 1, 2]) expect(screen.getByLabelText(label(i))).toBeTruthy();
    expect(mockSpeak).toHaveBeenCalledWith(items[0].en, expect.objectContaining({ lang: 'en-US' }));
  });

  it('mauvaise réponse: encouragement, le mot est redit, le choix est grisé, aucune étoile, aucune punition', async () => {
    const onCorrect = jest.fn();
    await play({ onCorrect });
    await startTopic();
    mockSpeak.mockClear();
    await fireEvent.press(screen.getByLabelText(label(1)));
    expect(screen.getByText(t('fr', 'tryAgain'))).toBeTruthy();
    expect(screen.getByLabelText(label(1))).toBeDisabled();
    expect(mockSpeak).toHaveBeenCalledWith(items[0].en, expect.anything());
    expect(onCorrect).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText(label(1))); // le même choix raté deux fois n'est pas compté deux fois
    expect(screen.queryAllByText(t('fr', 'tryAgain'))).toHaveLength(1);
  });

  it('bonne réponse: une étoile exactement (même après un essai raté), félicitations, plus de réponse possible', async () => {
    const onCorrect = jest.fn();
    await play({ onCorrect });
    await startTopic();
    await fireEvent.press(screen.getByLabelText(label(2))); // raté
    await fireEvent.press(screen.getByLabelText(label(0))); // juste
    await fireEvent.press(screen.getByLabelText(label(0))); // appui répété: ignoré
    await fireEvent.press(screen.getByLabelText(label(1)));
    expect(onCorrect).toHaveBeenCalledTimes(1);
    expect(screen.getByText(`${t('fr', 'bravo')} ${items[0].en}`)).toBeTruthy();
    expect(screen.getByText(`✓ ${items[0].en}`)).toBeTruthy();
  });

  it('sans micro: passe à la manche suivante tout seul après 1,4 s, pas avant', async () => {
    let clock = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    jest.useFakeTimers({ doNotFake: ['Date', 'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate'] });
    await play();
    await startTopic();
    await fireEvent.press(screen.getByLabelText(label(0)));
    clock += 1399;
    await act(async () => { jest.advanceTimersByTime(1399); });
    expect(screen.getByText('1/5')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(2); });
    expect(screen.getByText('2/5')).toBeTruthy();
    expect(screen.getByText(t('fr', 'whichOne'))).toBeTruthy(); // état de la manche réinitialisé
    expect(mockSpeak).toHaveBeenLastCalledWith(items[1].en, expect.anything());
  });

  it('avec micro autorisé: pas d\'avance automatique; exercice de prononciation et bouton « suivant »', async () => {
    jest.useFakeTimers({ doNotFake: ['Date', 'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate'] });
    await play({ micAllowed: true });
    await startTopic();
    await fireEvent.press(screen.getByLabelText(label(0)));
    expect(screen.getByText(`practice:${items[0].en}`)).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(screen.getByText('1/5')).toBeTruthy();
    await fireEvent.press(screen.getByText(t('fr', 'nextSentence')));
    expect(screen.getByText('2/5')).toBeTruthy();
    expect(screen.queryByText(/^practice:/)).toBeNull();
  });

  it('sans micro autorisé: jamais d\'exercice de prononciation', async () => {
    await play({ micAllowed: false });
    await startTopic();
    await fireEvent.press(screen.getByLabelText(label(0)));
    expect(screen.queryByText(/^practice:/)).toBeNull();
  });

  it('« Écouter » redit le mot', async () => {
    await play();
    await startTopic();
    mockSpeak.mockClear();
    await fireEvent.press(screen.getByText(`🔊 ${t('fr', 'listen')}`));
    expect(mockSpeak).toHaveBeenCalledWith(items[0].en, expect.objectContaining({ lang: 'en-US' }));
  });

  it('cinq manches puis écran de fin: étoiles gagnées, autocollant débloqué, retour avec le temps passé', async () => {
    let clock = 5_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    const onExit = jest.fn();
    const view = await play({ onExit, stars: 2, micAllowed: true });
    await startTopic();
    clock += 3 * 60_000;
    for (let k = 0; k < 5; k++) {
      await fireEvent.press(screen.getByLabelText(label(k)));
      await fireEvent.press(screen.getByText(t('fr', 'nextSentence')));
    }
    // le parent a ajouté les 5 étoiles: 2 → 7 franchit le seuil de la fusée (3)
    await view.rerender(<ThemeProvider profileId="kids"><PlayScreen lang="fr" stars={7} micAllowed onCorrect={jest.fn()} onExit={onExit} /></ThemeProvider>);
    expect(screen.getByText(t('fr', 'roundsDone'))).toBeTruthy();
    expect(screen.getByText('+5 ⭐')).toBeTruthy();
    expect(screen.getByText('🚀')).toBeTruthy();
    expect(screen.getByText(t('fr', 'newSticker'))).toBeTruthy();
    await fireEvent.press(screen.getByText(t('fr', 'back')));
    expect(onExit).toHaveBeenCalledWith(3);
  });

  it('quitter en cours de partie compte au moins une minute; l\'écran coupe la voix en partant', async () => {
    const onExit = jest.fn();
    const view = await play({ onExit });
    await startTopic();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(onExit).toHaveBeenCalledWith(1);
    mockStop.mockClear();
    await view.unmount();
    expect(mockStop).toHaveBeenCalled();
  });
});

type StoryProps = Partial<React.ComponentProps<typeof StoryScreen>>;
const story = (p: StoryProps = {}) => render(
  <ThemeProvider profileId="kids">
    <StoryScreen lang="fr" onFinish={jest.fn()} onExit={jest.fn()} {...p} />
  </ThemeProvider>,
);
const first = STORIES[0];

describe('StoryScreen (histoires)', () => {
  it('liste les histoires; « retour » quitte sans compter de temps', async () => {
    const onExit = jest.fn();
    await story({ onExit });
    for (const s of STORIES) expect(screen.getByLabelText(s.title.fr)).toBeTruthy();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(onExit).toHaveBeenCalledWith(0);
  });

  it('ouvre une histoire: première phrase lue, mots touchables, traduction, numérotation', async () => {
    await story();
    await fireEvent.press(screen.getByLabelText(first.title.fr));
    const s0 = first.sentences[0];
    expect(screen.getByText(`1/${first.sentences.length}`)).toBeTruthy();
    expect(mockSpeak).toHaveBeenCalledWith(s0.en, expect.objectContaining({ lang: 'en-US' }));
    expect(screen.getByText(s0.fr)).toBeTruthy();
    for (const w of s0.en.split(' ')) expect(screen.getAllByLabelText(w).length).toBeGreaterThan(0);
  });

  it('toucher un mot le lit seul, sans sa ponctuation', async () => {
    await story();
    await fireEvent.press(screen.getByLabelText(first.title.fr));
    const withPunct = first.sentences[0].en.split(' ').find((w) => /[.,!?]$/.test(w));
    expect(withPunct).toBe('cat.');
    mockSpeak.mockClear();
    await fireEvent.press(screen.getAllByLabelText('cat.')[0]);
    expect(mockSpeak).toHaveBeenCalledWith('cat', expect.anything());
  });

  it('interface en anglais: pas de traduction affichée', async () => {
    await render(<ThemeProvider profileId="kids"><StoryScreen lang="en" onFinish={jest.fn()} onExit={jest.fn()} /></ThemeProvider>);
    await fireEvent.press(screen.getByLabelText(first.title.en));
    expect(screen.queryByText(first.sentences[0].fr)).toBeNull();
  });

  it('phrase suivante, puis « Terminer » à la dernière; fin: +2 étoiles et retour avec l\'histoire et le temps', async () => {
    let clock = 9_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    const onFinish = jest.fn();
    await story({ onFinish });
    await fireEvent.press(screen.getByLabelText(first.title.fr));
    clock += 2 * 60_000;
    const n = first.sentences.length;
    for (let k = 0; k < n - 1; k++) {
      expect(screen.getByText(`${k + 1}/${n}`)).toBeTruthy();
      expect(screen.queryByText(t('fr', 'finish'))).toBeNull();
      await fireEvent.press(screen.getByText(t('fr', 'nextSentence')));
      expect(mockSpeak).toHaveBeenLastCalledWith(first.sentences[k + 1].en, expect.anything());
    }
    expect(screen.getByText(`${n}/${n}`)).toBeTruthy();
    await fireEvent.press(screen.getByText(t('fr', 'finish')));
    expect(screen.getByText(t('fr', 'storyDone'))).toBeTruthy();
    expect(screen.getByText('+2 ⭐')).toBeTruthy();
    expect(onFinish).not.toHaveBeenCalled(); // récompense donnée seulement au retour
    await fireEvent.press(screen.getByText(t('fr', 'back')));
    expect(onFinish).toHaveBeenCalledWith(first.id, 2);
  });

  it('quitter en cours de lecture compte au moins une minute; la voix est coupée en partant', async () => {
    const onExit = jest.fn();
    const view = await story({ onExit });
    await fireEvent.press(screen.getByLabelText(first.title.fr));
    await fireEvent.press(screen.getByText(/Retour/));
    expect(onExit).toHaveBeenCalledWith(1);
    mockStop.mockClear();
    await view.unmount();
    expect(mockStop).toHaveBeenCalled();
  });

  it('« Écouter » relit la phrase en cours', async () => {
    await story();
    await fireEvent.press(screen.getByLabelText(first.title.fr));
    mockSpeak.mockClear();
    await fireEvent.press(screen.getByText(`🔊 ${t('fr', 'listen')}`));
    expect(mockSpeak).toHaveBeenCalledWith(first.sentences[0].en, expect.objectContaining({ lang: 'en-US' }));
  });
});

// Garde-fou de contenu: chaque histoire et chaque thème est complet dans les cinq langues d'interface.
describe('contenu enfants', () => {
  it('chaque thème a au moins 3 éléments distincts (de quoi former une manche à 3 choix)', () => {
    for (const tp of KIDS_TOPICS) {
      expect(tp.items.length).toBeGreaterThanOrEqual(3);
      expect(new Set(tp.items.map((i) => i.id)).size).toBe(tp.items.length);
    }
  });
  it('identifiants uniques dans tous les thèmes; dans un thème, ni mot ni image en double (l\'enfant doit pouvoir les distinguer)', () => {
    const ids = KIDS_TOPICS.flatMap((tp) => tp.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const tp of KIDS_TOPICS) {
      expect(new Set(tp.items.map((i) => i.en)).size).toBe(tp.items.length);
      expect(new Set(tp.items.map((i) => i.emoji)).size).toBe(tp.items.length);
      for (const i of tp.items) for (const k of ['en', 'fr', 'ar', 'es', 'zh'] as const) expect(i[k].trim()).not.toBe('');
      for (const lang of ['fr', 'en', 'ar', 'es', 'zh'] as const) expect(tp.title[lang].trim()).not.toBe('');
    }
  });
  it('chaque thème fournit des manches complètes (3 choix distincts dont la bonne réponse)', () => {
    for (const tp of KIDS_TOPICS) {
      const rounds = buildRounds(tp.id);
      expect(rounds.length).toBe(Math.min(5, tp.items.length));
      for (const r of rounds) { expect(new Set(r.options.map((o) => o.id)).size).toBe(3); expect(r.options.map((o) => o.id)).toContain(r.target.id); }
    }
  });
  it('au moins 8 thèmes et 7 histoires, titres traduits, identifiants d\'histoire uniques', () => {
    expect(KIDS_TOPICS.length).toBeGreaterThanOrEqual(8);
    expect(STORIES.length).toBeGreaterThanOrEqual(7);
    expect(new Set(STORIES.map((x) => x.id)).size).toBe(STORIES.length);
    for (const x of STORIES) for (const lang of ['fr', 'en', 'ar', 'es', 'zh'] as const) expect(x.title[lang].trim()).not.toBe('');
  });
  it('chaque histoire a des phrases traduites partout', () => {
    for (const s of STORIES) for (const sent of s.sentences) for (const k of ['en', 'fr', 'ar', 'es', 'zh'] as const) expect(sent[k].trim()).not.toBe('');
  });
});

