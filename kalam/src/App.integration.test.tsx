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

describe('App: accueil et réglages', () => {
  const adult = async () => {
    mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'adult', levels: { en: 'A1' }, uiLang: 'fr' }));
    await boot();
    await screen.findByText(/Kalam · A1/);
  };

  it('le gros bouton « Continuer » ouvre la prochaine leçon', async () => {
    await adult();
    await fireEvent.press(screen.getByText(/▶ Continuer: /));
    expect(await screen.findByText('Terminer la leçon')).toBeTruthy();
  });

  it('les réglages s\'ouvrent depuis l\'accueil et on en revient', async () => {
    await adult();
    await fireEvent.press(screen.getByLabelText('Réglages'));
    expect(await screen.findByText('Exporter mes données')).toBeTruthy();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(await screen.findByText(/▶ Continuer: /)).toBeTruthy();
  });

  it('changer la langue de l\'interface dans les réglages est appliqué partout et sauvegardé', async () => {
    await adult();
    await fireEvent.press(screen.getByLabelText('Réglages'));
    await fireEvent.press(await screen.findByLabelText('English'));
    expect(await screen.findByText('Export my data')).toBeTruthy();
    await fireEvent.press(screen.getByText(/Back/));
    expect(await screen.findByText(/▶ Continue: /)).toBeTruthy();
    await waitFor(() => expect(saved().uiLang).toBe('en'));
  });

  it('changer l\'objectif quotidien et la palette est sauvegardé', async () => {
    await adult();
    await fireEvent.press(screen.getByLabelText('Réglages'));
    await fireEvent.press(await screen.findByLabelText('20 min'));
    await fireEvent.press(screen.getByLabelText('Océan'));
    await waitFor(() => expect(saved()).toMatchObject({ palette: 'ocean', progress: { dailyGoalMinutes: 20 } }));
  });

  it('« Changer de profil » depuis les réglages ramène au choix du profil', async () => {
    await adult();
    await fireEvent.press(screen.getByLabelText('Réglages'));
    await fireEvent.press(await screen.findByText('Changer de profil'));
    expect(await screen.findByText('Qui va apprendre ?')).toBeTruthy();
  });

  it('l\'effacement des données (après confirmation) ramène à l\'état initial', async () => {
    const { Alert } = require('react-native'); // eslint-disable-line @typescript-eslint/no-require-imports
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await adult();
    mockStore.set('kalam:conv:v1:restaurant', JSON.stringify([{ role: 'user', content: 'secret' }]));
    await fireEvent.press(screen.getByLabelText('Réglages'));
    await fireEvent.press(await screen.findByText('Effacer mes données'));
    (alert.mock.calls[0][2] as { onPress?: () => void }[])[1].onPress?.();
    expect(await screen.findByText('Qui va apprendre ?')).toBeTruthy();
    await waitFor(() => expect([...mockStore.keys()].filter((k) => k.startsWith('kalam:conv:'))).toEqual([])); // conversations effacées aussi
    alert.mockRestore();
  });
});

describe('App: changer de profil ne détruit pas les réglages', () => {
  const adultFr = () => mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'adult', targetLang: 'fr', levels: { en: 'B1', fr: 'A2' }, uiLang: 'fr' }));

  it('« Changer de profil » garde les niveaux de toutes les langues', async () => {
    adultFr();
    await boot();
    await fireEvent.press(await screen.findByLabelText('Réglages'));
    await fireEvent.press(await screen.findByText('Changer de profil'));
    expect(await screen.findByText('Qui va apprendre ?')).toBeTruthy();
    await waitFor(() => expect(saved()).toMatchObject({ profile: null, targetLang: 'fr', levels: { en: 'B1', fr: 'A2' } }));
  });

  it('passer au profil adulte après un changement revient à l\'accueil SANS refaire le test de niveau', async () => {
    adultFr();
    await boot();
    await fireEvent.press(await screen.findByLabelText('Réglages'));
    await fireEvent.press(await screen.findByText('Changer de profil'));
    await fireEvent.press(await screen.findByText('Ado / Adulte'));
    expect(await screen.findByText(/Kalam · A2/)).toBeTruthy(); // niveau de français conservé
    expect(screen.queryByText('Test de niveau')).toBeNull();
  });

  it('choisir le profil Enfant n\'écrase ni le niveau, ni la langue apprise de l\'adulte', async () => {
    adultFr();
    await boot();
    await fireEvent.press(await screen.findByLabelText('Réglages'));
    await fireEvent.press(await screen.findByText('Changer de profil'));
    await fireEvent.press(await screen.findByText('Enfant (4-8 ans)'));
    expect(await screen.findByText('Histoires')).toBeTruthy();
    await waitFor(() => expect(saved()).toMatchObject({ profile: 'kids', targetLang: 'fr', levels: { en: 'B1', fr: 'A2' } }));
  });

  it('un nouvel utilisateur qui choisit Enfant n\'a aucun niveau enregistré (le mode enfant n\'en a pas besoin)', async () => {
    await boot();
    await fireEvent.press(await screen.findByText('Enfant (4-8 ans)'));
    expect(await screen.findByText('Histoires')).toBeTruthy();
    expect(screen.queryByText('Test de niveau')).toBeNull();
    await waitFor(() => expect(saved()).toMatchObject({ profile: 'kids', levels: {} }));
  });
});

describe('App: mode enfant', () => {
  it('enfant: pas de test de niveau, accueil enfant; la langue apprise choisie n\'est pas modifiée (le contenu enfant est en anglais)', async () => {
    await boot();
    await fireEvent.press(await screen.findByLabelText('Langue à apprendre: Français'));
    await fireEvent.press(screen.getByText('Enfant (4-8 ans)'));
    expect(await screen.findByText('Histoires')).toBeTruthy();
    expect(screen.queryByText('Test de niveau')).toBeNull();
    await waitFor(() => expect(saved()).toMatchObject({ profile: 'kids', targetLang: 'fr', levels: {} }));
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

describe('App: sauvegarde partiellement abîmée (chaque champ est vérifié)', () => {
  const start = async (state: object) => { mockStore.set('kalam:state:v1', JSON.stringify(state)); await boot(); };
  const ok = { profile: 'adult', levels: { en: 'A1' }, uiLang: 'fr' };

  it('palette inconnue: thème par défaut, pas de plantage', async () => {
    await start({ ...ok, palette: 'neon-disco' });
    expect(await screen.findByText(/Kalam · A1/)).toBeTruthy();
  });
  it('profil inconnu: retour au choix du profil', async () => {
    await start({ ...ok, profile: 'wizard' });
    expect(await screen.findByText('Qui va apprendre ?')).toBeTruthy();
  });
  it('langue d\'interface inconnue: français par défaut', async () => {
    await start({ ...ok, uiLang: 'klingon' });
    expect(await screen.findByText(/Kalam · A1/)).toBeTruthy();
    expect(screen.getByText(/Continuer/)).toBeTruthy();
  });
  it.each([
    ['cartes: un objet au lieu d\'une liste', { cards: { a: 1 } }],
    ['cartes: des éléments invalides', { cards: [null, 5, 'x', { key: 3 }, { key: 'restaurant:0', ease: 'x', intervalDays: -1, due: 'hier' }] }],
    ['mode enfant: histoires lues non-liste', { kids: { storiesRead: 'oups', stars: 'beaucoup', consent: 'oui', dailyLimit: 'jamais' } }],
    ['mode enfant: tout à null', { kids: null }],
  ])('%s: l\'accueil s\'affiche, la révision et le reste fonctionnent', async (_label, extra) => {
    await start({ ...ok, ...extra });
    expect(await screen.findByText(/Kalam · A1/)).toBeTruthy();
    await fireEvent.press(screen.getByText(/^Réviser/)); // ouvre la révision sans planter
    expect(await screen.findByText('Rien à réviser pour le moment. Bravo !')).toBeTruthy();
  });
  it('mode enfant avec des valeurs abîmées: l\'accueil enfant et l\'espace parents restent utilisables', async () => {
    await start({ profile: 'kids', uiLang: 'fr', kids: { storiesRead: 7, stars: -3, consent: { micAllowed: 'oui' }, dailyLimit: 12 } });
    expect(await screen.findByText('Histoires')).toBeTruthy();
    expect(screen.getByLabelText('0 étoiles')).toBeTruthy(); // les étoiles ne sont ni négatives ni NaN
    expect(screen.queryByLabelText(/NaN|-3/)).toBeNull();
  });
});

describe('App: sauvegarde corrompue', () => {
  it.each(['null', '42', '"texte"', '[]', '[1,2]', 'true'])('une sauvegarde valant %s ne bloque pas l\'app sur le chargement', async (raw) => {
    mockStore.set('kalam:state:v1', raw);
    await boot();
    expect(await screen.findByText('Qui va apprendre ?')).toBeTruthy();
  });

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
