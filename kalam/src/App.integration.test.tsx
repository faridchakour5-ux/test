import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import App from '../App';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => mockStore.get(k) ?? null,
    setItem: async (k: string, v: string) => { mockStore.set(k, v); },
    removeItem: async (k: string) => { mockStore.delete(k); },
    getAllKeys: async () => [...mockStore.keys()],
    removeMany: async (ks: string[]) => { ks.forEach((k) => mockStore.delete(k)); },
  },
}));
jest.mock('./speech/tts', () => ({ tts: { speak: jest.fn(async () => 'done'), speakStream: jest.fn(), stop: jest.fn(async () => undefined), hasVoice: async () => true } }));
jest.mock('./speech/recognizer', () => ({ isSpeechInputAvailable: () => false, cancelListening: jest.fn(), listenOnce: jest.fn() }));
jest.mock('./api/teacher', () => ({ ...jest.requireActual('./api/teacher'), askTeacher: jest.fn(async () => 'Hello!'), askTeacherStream: jest.fn() }));

const saved = () => JSON.parse(mockStore.get('kalam:state:v1') ?? '{}');
const boot = async () => { await render(<App />); await act(async () => {}); };

beforeEach(() => mockStore.clear());

describe('App: premier lancement', () => {
  it('affiche le choix du profil, de la langue à apprendre et de la langue de l\'interface', async () => {
    await boot();
    expect(await screen.findByText('Qui va apprendre ?')).toBeTruthy();
    expect(screen.getByLabelText('Langue à apprendre: Anglais')).toBeTruthy();
    expect(screen.getByLabelText('Langue à apprendre: Français')).toBeTruthy();
  });

  it('adulte: profil -> test de niveau d\'anglais -> accueil, et tout est sauvegardé', async () => {
    await boot();
    await fireEvent.press(await screen.findByText('Ado / Adulte'));
    expect(await screen.findByText('Test de niveau')).toBeTruthy();
    expect(screen.getByText('She ___ a teacher.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Passer'));
    expect(await screen.findByText(/Kalam · A1/)).toBeTruthy();
    await waitFor(() => expect(saved()).toMatchObject({ profile: 'adult', targetLang: 'en', levels: { en: 'A1' } }));
  });

  it('choisir le français AVANT le profil mène au test de niveau français', async () => {
    await boot();
    await fireEvent.press(await screen.findByLabelText('Langue à apprendre: Français'));
    await fireEvent.press(screen.getByText('Ado / Adulte'));
    expect(await screen.findByText('Elle ___ professeur.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Passer'));
    await waitFor(() => expect(saved()).toMatchObject({ targetLang: 'fr', levels: { fr: 'A1' } }));
  });
});

describe('App: changer de langue apprise', () => {
  const setupAdult = async () => {
    mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'adult', level: 'A2', uiLang: 'fr' }));
    await boot();
    expect(await screen.findByText(/Kalam · A2/)).toBeTruthy();
  };

  it('une ancienne sauvegarde (niveau unique) ouvre directement l\'accueil au bon niveau, sans refaire le test', async () => {
    await setupAdult();
    expect(screen.queryByText('Test de niveau')).toBeNull();
    expect(screen.getByLabelText('Langue à apprendre: Anglais')).toHaveProp('accessibilityState', { checked: true });
  });

  it('passer au français demande le test de niveau français, puis revenir à l\'anglais garde A2', async () => {
    await setupAdult();
    await fireEvent.press(screen.getByLabelText('Langue à apprendre: Français'));
    expect(await screen.findByText('Elle ___ professeur.')).toBeTruthy(); // pas encore de niveau en français
    await fireEvent.press(screen.getByText('Passer'));
    expect(await screen.findByText(/Kalam · A1/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Langue à apprendre: Anglais'));
    expect(await screen.findByText(/Kalam · A2/)).toBeTruthy(); // le niveau d'anglais n'a pas été écrasé
    await waitFor(() => expect(saved().levels).toEqual({ en: 'A2', fr: 'A1' }));
  });

  it('ouvrir une leçon puis revenir à l\'accueil', async () => {
    await setupAdult();
    await fireEvent.press(screen.getAllByLabelText('Se présenter')[0]);
    expect(await screen.findByText('Terminer la leçon')).toBeTruthy();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(await screen.findByText(/Kalam · A2/)).toBeTruthy();
  });

  it('terminer une leçon enregistre la progression et crée les cartes de révision DE LA LANGUE APPRISE', async () => {
    await setupAdult();
    await fireEvent.press(screen.getByLabelText('Langue à apprendre: Français'));
    await fireEvent.press(await screen.findByText('Passer'));
    await screen.findByText(/Kalam · A1/);
    await fireEvent.press(screen.getAllByLabelText('Se présenter')[0]);
    await fireEvent.press(await screen.findByText('Terminer la leçon'));
    await waitFor(() => {
      const s = saved();
      expect(s.progress.completedLessons).toContain('fr:greetings'); // clé propre au français
      expect(s.cards.every((c: { key: string }) => c.key.startsWith('fr:'))).toBe(true);
      expect(s.cards.length).toBeGreaterThanOrEqual(4);
    });
  });
});

describe('App: mode enfant', () => {
  it('enfant: pas de test de niveau, accueil enfant, langue forcée à l\'anglais', async () => {
    await boot();
    await fireEvent.press(await screen.findByLabelText('Langue à apprendre: Français'));
    await fireEvent.press(screen.getByText('Enfant (4-8 ans)'));
    expect(await screen.findByText('Histoires')).toBeTruthy();
    expect(screen.queryByText('Test de niveau')).toBeNull();
    await waitFor(() => expect(saved()).toMatchObject({ profile: 'kids', targetLang: 'en', levels: { en: 'A1' } }));
  });

  describe('espace parents (question d\'adulte déterministe: Math.random figé -> 6 × 6 = 36)', () => {
    beforeEach(() => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'kids', levels: { en: 'A1' }, uiLang: 'fr' }));
    });
    afterEach(() => jest.restoreAllMocks());

    it('une mauvaise réponse est refusée et l\'espace reste fermé', async () => {
      await boot();
      await fireEvent.press(await screen.findByLabelText('Parents'));
      expect(await screen.findByText(/combien font 6 × 6/)).toBeTruthy();
      await fireEvent.press(screen.getByLabelText('26')); // fausse réponse
      expect(await screen.findByText('Mauvaise réponse. Réessayez.')).toBeTruthy();
      expect(screen.queryAllByText('Effacer toutes les données')).toHaveLength(0);
    });

    it('la bonne réponse ouvre l\'espace parents', async () => {
      await boot();
      await fireEvent.press(await screen.findByLabelText('Parents'));
      await fireEvent.press(await screen.findByLabelText('36'));
      // le titre ET le bouton portent ce texte: on attend au moins un des deux
      expect((await screen.findAllByText('Effacer toutes les données')).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Mauvaise réponse. Réessayez.')).toBeNull();
    });
  });

  it('un enfant n\'a aucun accès à la conversation libre ni au mode à deux depuis l\'accueil enfant', async () => {
    mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'kids', levels: { en: 'A1' }, uiLang: 'fr' }));
    await boot();
    await screen.findByText('Histoires');
    expect(screen.queryByText(/Conversation à deux/)).toBeNull();
    expect(screen.queryByText('Parle librement')).toBeNull();
  });
});

describe('App: sauvegarde corrompue', () => {
  it('une sauvegarde illisible ne plante pas l\'app: retour au choix du profil', async () => {
    mockStore.set('kalam:state:v1', '{pas du json');
    await boot();
    expect(await screen.findByText('Qui va apprendre ?')).toBeTruthy();
  });
  it('une sauvegarde aux valeurs absurdes est réparée', async () => {
    mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'adult', targetLang: 'klingon', levels: { en: 'Z9', fr: 'A2' }, progress: { xp: 'beaucoup', minutesToday: -4 }, uiLang: 'fr' }));
    await boot();
    // niveau d'anglais invalide -> test de niveau d'anglais (langue inconnue repliée sur l'anglais)
    expect(await screen.findByText('She ___ a teacher.')).toBeTruthy();
  });
});
