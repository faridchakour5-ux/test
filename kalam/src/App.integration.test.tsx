import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { resetGateLock } from './state/gateLock';
import App from '../App';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => mockStore.get(k) ?? null,
    setItem: async (k: string, v: string) => { mockStore.set(k, v); },
    removeItem: async (k: string) => { mockStore.delete(k); },
    getAllKeys: async () => [...mockStore.keys()],
    multiRemove: async (ks: string[]) => { ks.forEach((k) => mockStore.delete(k)); },
  },
}));
jest.mock('./speech/tts', () => ({ tts: { speak: jest.fn(async () => 'done'), speakStream: jest.fn(), stop: jest.fn(async () => undefined), hasVoice: async () => true } }));
jest.mock('./speech/recognizer', () => ({ isSpeechInputAvailable: () => false, cancelListening: jest.fn(), listenOnce: jest.fn() }));
jest.mock('./api/teacher', () => ({ ...jest.requireActual('./api/teacher'), askTeacher: jest.fn(async () => 'Hello!'), askTeacherStream: jest.fn() }));

// Faux module natif de notifications: la vraie logique du rappel (src/notifications) tourne, seul le téléphone est simulé.
const mockNotif = {
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async (_req: unknown) => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async (_id: string) => undefined),
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
};
jest.mock('expo-notifications', () => mockNotif);

const saved = () => JSON.parse(mockStore.get('kalam:state:v1') ?? '{}');
const boot = async () => { await render(<App />); await act(async () => {}); };

beforeEach(() => {
  mockStore.clear();
  mockNotif.getPermissionsAsync.mockImplementation(async () => ({ granted: true }));
  mockNotif.requestPermissionsAsync.mockImplementation(async () => ({ granted: true }));
  Object.values(mockNotif).forEach((f) => { if (typeof f === 'function') (f as jest.Mock).mockClear(); });
});

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
    expect(await screen.findByLabelText(/Kalam\s·\sA1/)).toBeTruthy();
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
    expect(await screen.findByLabelText(/Kalam\s·\sA2/)).toBeTruthy();
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
    expect(await screen.findByLabelText(/Kalam\s·\sA1/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Langue à apprendre: Anglais'));
    expect(await screen.findByLabelText(/Kalam\s·\sA2/)).toBeTruthy(); // le niveau d'anglais n'a pas été écrasé
    await waitFor(() => expect(saved().levels).toEqual({ en: 'A2', fr: 'A1' }));
  });

  it('ouvrir une leçon puis revenir à l\'accueil', async () => {
    await setupAdult();
    await fireEvent.press(screen.getAllByLabelText('Se présenter')[0]);
    expect(await screen.findByText('Terminer la leçon')).toBeTruthy();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(await screen.findByLabelText(/Kalam\s·\sA2/)).toBeTruthy();
  });

  it('terminer une leçon enregistre la progression et crée les cartes de révision DE LA LANGUE APPRISE', async () => {
    await setupAdult();
    await fireEvent.press(screen.getByLabelText('Langue à apprendre: Français'));
    await fireEvent.press(await screen.findByText('Passer'));
    await screen.findByLabelText(/Kalam\s·\sA1/);
    await fireEvent.press(screen.getAllByLabelText('Se présenter')[0]);
    await fireEvent.changeText(await screen.findByPlaceholderText('Écrivez votre message…'), 'Bonjour'); // sans rien dire, la leçon ne compte pas
    await fireEvent.press(screen.getByText('Envoyer'));
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
    await screen.findByLabelText(/Kalam\s·\sA1/);
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

  it('les réglages donnent accès au diagnostic de l\'appareil, et on en revient aux réglages', async () => {
    await adult();
    await fireEvent.press(screen.getByLabelText('Réglages'));
    await fireEvent.press(await screen.findByText('🩺 Diagnostic de l\'appareil'));
    expect(await screen.findByText(/Vérifie en quelques secondes/)).toBeTruthy();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(await screen.findByText('Changer de profil')).toBeTruthy();
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
    expect(await screen.findByLabelText(/Kalam\s·\sA2/)).toBeTruthy(); // niveau de français conservé
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
    afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
    beforeEach(() => resetGateLock()); // le verrou vit pendant toute la session de l'app: on repart de zéro à chaque test

    it('3 mauvaises réponses de suite bloquent le portail, même avec la bonne réponse ensuite, puis il se rouvre', async () => {
      let clock = 1_000_000;
      jest.spyOn(Date, 'now').mockImplementation(() => clock);
      jest.useFakeTimers({ doNotFake: ['Date', 'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate'] });
      await boot();
      await fireEvent.press(await screen.findByLabelText('Parents'));
      for (let i = 0; i < 3; i++) await fireEvent.press(await screen.findByLabelText('35'));
      expect(await screen.findByText(/Trop d'essais/)).toBeTruthy();
      await fireEvent.press(screen.getByLabelText('36')); // bonne réponse, mais pendant la pause
      expect(screen.queryAllByText('Effacer toutes les données')).toHaveLength(0);
      clock += 31_000; // la pause de 30 s est passée
      await act(async () => { jest.advanceTimersByTime(31_000); }); // la minuterie réactive les boutons
      jest.useRealTimers();
      await fireEvent.press(screen.getByLabelText('36'));
      expect((await screen.findAllByText('Effacer toutes les données')).length).toBeGreaterThanOrEqual(1);
    });

    it('quitter puis rouvrir l\'espace parents ne remet pas les essais à zéro', async () => {
      await boot();
      await fireEvent.press(await screen.findByLabelText('Parents'));
      for (let i = 0; i < 3; i++) await fireEvent.press(await screen.findByLabelText('35'));
      await screen.findByText(/Trop d'essais/);
      await fireEvent.press(screen.getByLabelText('Retour'));
      await fireEvent.press(await screen.findByLabelText('Parents'));
      expect(await screen.findByText(/Trop d'essais/)).toBeTruthy();
    });

    it('une mauvaise réponse est refusée et l\'espace reste fermé', async () => {
      await boot();
      await fireEvent.press(await screen.findByLabelText('Parents'));
      expect(await screen.findByText(/combien font 6 × 6/)).toBeTruthy();
      await fireEvent.press(screen.getByLabelText('35')); // fausse réponse
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
    expect(await screen.findByLabelText(/Kalam\s·\sA1/)).toBeTruthy();
  });
  it('profil inconnu: retour au choix du profil', async () => {
    await start({ ...ok, profile: 'wizard' });
    expect(await screen.findByText('Qui va apprendre ?')).toBeTruthy();
  });
  it('langue d\'interface inconnue: français par défaut', async () => {
    await start({ ...ok, uiLang: 'klingon' });
    expect(await screen.findByLabelText(/Kalam\s·\sA1/)).toBeTruthy();
    expect(screen.getByText(/Continuer/)).toBeTruthy();
  });
  it.each([
    ['cartes: un objet au lieu d\'une liste', { cards: { a: 1 } }],
    ['cartes: des éléments invalides', { cards: [null, 5, 'x', { key: 3 }, { key: 'restaurant:0', ease: 'x', intervalDays: -1, due: 'hier' }] }],
    ['mode enfant: histoires lues non-liste', { kids: { storiesRead: 'oups', stars: 'beaucoup', consent: 'oui', dailyLimit: 'jamais' } }],
    ['mode enfant: tout à null', { kids: null }],
  ])('%s: l\'accueil s\'affiche, la révision et le reste fonctionnent', async (_label, extra) => {
    await start({ ...ok, ...extra });
    expect(await screen.findByLabelText(/Kalam\s·\sA1/)).toBeTruthy();
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

describe('App: rappel quotidien (notifications locales)', () => {
  const start = async (state: object = {}) => {
    mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'adult', levels: { en: 'A1' }, uiLang: 'fr', ...state }));
    await boot();
    await screen.findByLabelText(/Kalam\s·\sA1/);
  };
  const openSettings = async () => { await fireEvent.press(screen.getByLabelText('Réglages')); await screen.findByText('Exporter mes données'); };
  const toggle = () => fireEvent(screen.getByLabelText('Me rappeler chaque jour'), 'valueChange', true);

  it('désactivé par défaut: rien n\'est programmé et aucune autorisation n\'est demandée', async () => {
    await start();
    expect(mockNotif.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockNotif.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('l\'activer demande l\'autorisation, programme UN rappel quotidien à 19:00 dans la langue de l\'interface, et le sauvegarde', async () => {
    mockNotif.getPermissionsAsync.mockImplementation(async () => ({ granted: false, canAskAgain: true } as never));
    await start();
    await openSettings();
    await toggle();
    await waitFor(() => expect(saved().reminder).toEqual({ enabled: true, hour: 19, minute: 0 }));
    expect(mockNotif.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    const last = mockNotif.scheduleNotificationAsync.mock.calls.at(-1)![0] as { identifier: string; content: { title: string; body: string }; trigger: { type: string; hour: number; minute: number } };
    expect(last.identifier).toBe('kalam-daily-reminder');
    expect(last.trigger).toMatchObject({ type: 'daily', hour: 19, minute: 0 });
    expect(last.content).toEqual({ title: 'Kalam', body: 'Un petit moment pour parler ? Quelques minutes suffisent.' });
  });

  it('choisir une autre heure reprogramme le rappel (jamais deux)', async () => {
    await start({ reminder: { enabled: true, hour: 19, minute: 0 } });
    await openSettings();
    await fireEvent.press(screen.getByLabelText('08:00'));
    await waitFor(() => expect(saved().reminder).toEqual({ enabled: true, hour: 8, minute: 0 }));
    const calls = mockNotif.scheduleNotificationAsync.mock.calls as unknown as { 0: { identifier: string; trigger: { hour: number } } }[];
    expect(calls.at(-1)![0].trigger.hour).toBe(8);
    expect(new Set(calls.map((c) => c[0].identifier))).toEqual(new Set(['kalam-daily-reminder']));
  });

  it('au lancement, un rappel actif est remis d\'aplomb (redémarrage du téléphone, changement de fuseau)', async () => {
    await start({ reminder: { enabled: true, hour: 12, minute: 30 } });
    await waitFor(() => expect(mockNotif.scheduleNotificationAsync).toHaveBeenCalled());
    expect((mockNotif.scheduleNotificationAsync.mock.calls.at(-1)![0] as { trigger: { hour: number; minute: number } }).trigger).toMatchObject({ hour: 12, minute: 30 });
    expect(mockNotif.requestPermissionsAsync).not.toHaveBeenCalled(); // jamais de demande toute seule
  });

  it('autorisation refusée: message clair, rappel non activé et non sauvegardé', async () => {
    mockNotif.getPermissionsAsync.mockImplementation(async () => ({ granted: false, canAskAgain: true } as never));
    mockNotif.requestPermissionsAsync.mockImplementation(async () => ({ granted: false, canAskAgain: true } as never));
    await start();
    await openSettings();
    await toggle();
    expect(await screen.findByText(/notifications sont refusées/)).toBeTruthy();
    expect(mockNotif.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(saved().reminder?.enabled ?? false).toBe(false);
  });

  it('profil enfant: jamais de rappel, même si une sauvegarde en contient un', async () => {
    await start({ profile: 'kids' }).catch(() => undefined);
    mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'kids', levels: { en: 'A1' }, uiLang: 'fr', reminder: { enabled: true, hour: 19, minute: 0 } }));
    await boot();
    await screen.findByText('Histoires');
    expect(mockNotif.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockNotif.cancelScheduledNotificationAsync).toHaveBeenCalledWith('kalam-daily-reminder');
  });

  it('effacer les données arrête aussi le rappel', async () => {
    await start({ reminder: { enabled: true, hour: 19, minute: 0 } });
    await openSettings();
    mockNotif.cancelScheduledNotificationAsync.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => { buttons?.find((b) => b.style === 'destructive')?.onPress?.(); });
    await fireEvent.press(screen.getByText('Effacer mes données'));
    await waitFor(() => expect(mockNotif.cancelScheduledNotificationAsync).toHaveBeenCalledWith('kalam-daily-reminder'));
  });

  describe('proposition unique d\'un rappel doux', () => {
    const afterFirstLesson = { progress: { completedLessons: ['family'] } };

    it('pas de proposition avant la première leçon terminée', async () => {
      await start();
      expect(screen.queryByText(/Un rappel doux/)).toBeNull();
    });

    it('après la première leçon: « Oui » active le rappel à 19:00 (autorisation demandée à ce moment) et la proposition ne revient plus', async () => {
      mockNotif.getPermissionsAsync.mockImplementation(async () => ({ granted: false, canAskAgain: true } as never));
      await start(afterFirstLesson);
      await fireEvent.press(await screen.findByLabelText('Oui, à 19:00'));
      await waitFor(() => expect(saved().reminder).toEqual({ enabled: true, hour: 19, minute: 0 }));
      expect(saved().reminderAsked).toBe(true);
      expect(mockNotif.requestPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/Un rappel doux/)).toBeNull();
    });

    it('« Non merci »: rien n\'est programmé, aucune autorisation demandée, et on ne repropose jamais', async () => {
      await start(afterFirstLesson);
      await fireEvent.press(await screen.findByLabelText('Non merci'));
      await waitFor(() => expect(saved().reminderAsked).toBe(true));
      expect(mockNotif.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(mockNotif.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(screen.queryByText(/Un rappel doux/)).toBeNull();
    });

    it('pas de proposition si elle a déjà été faite, ni si le rappel est déjà actif', async () => {
      await start({ ...afterFirstLesson, reminderAsked: true });
      expect(screen.queryByText(/Un rappel doux/)).toBeNull();
    });
    it('rappel déjà actif: pas de proposition', async () => {
      await start({ ...afterFirstLesson, reminder: { enabled: true, hour: 8, minute: 0 } });
      expect(screen.queryByText(/Un rappel doux/)).toBeNull();
    });
  });
});

