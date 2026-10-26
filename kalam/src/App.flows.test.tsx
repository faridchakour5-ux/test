import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { BackHandler } from 'react-native';
import App from '../App';
import { initialProgress, localDay } from './domain/progress';
import { KIDS_TOPICS, STORIES } from './domain/kids';
import { newCard } from './domain/srs';
import { pick, t } from './i18n/strings';
import { resetGateLock } from './state/gateLock';
import { deviceUiLang } from './i18n/deviceLanguage';

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
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: async () => ({ granted: true }), requestPermissionsAsync: async () => ({ granted: true }),
  setNotificationChannelAsync: async () => null, scheduleNotificationAsync: async () => 'id', cancelScheduledNotificationAsync: async () => undefined,
  AndroidImportance: { DEFAULT: 5 }, SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

const saved = () => JSON.parse(mockStore.get('kalam:state:v1') ?? '{}');
const boot = async () => { await render(<App />); await act(async () => {}); };
const today = () => localDay();
const kidsState = (over: Record<string, unknown> = {}, kids: Record<string, unknown> = {}, progress: Record<string, unknown> = {}) => JSON.stringify({
  profile: 'kids', uiLang: 'fr', levels: { en: 'A1' },
  kids: { stars: 3, storiesRead: [], consent: { micAllowed: false, grantedAt: null, version: 1 }, dailyLimit: null, ...kids },
  progress: { ...initialProgress(today()), ...progress },
  ...over,
});

beforeEach(() => { mockStore.clear(); resetGateLock(); jest.spyOn(Math, 'random').mockReturnValue(0.999999); });
afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });

describe('App: histoires de l\'enfant', () => {
  const first = STORIES[0];

  it('lire une histoire jusqu\'au bout: +2 étoiles, histoire notée lue, temps compté, retour à l\'accueil enfant', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await boot();
    await fireEvent.press(await screen.findByLabelText(t('fr', 'stories')));
    await fireEvent.press(await screen.findByLabelText(first.title.fr));
    for (let k = 0; k < first.sentences.length - 1; k++) await fireEvent.press(screen.getByText(t('fr', 'nextSentence')));
    await fireEvent.press(screen.getByText(t('fr', 'finish')));
    await fireEvent.press(await screen.findByText(t('fr', 'back')));
    expect(await screen.findByLabelText(`5 ${t('fr', 'stars')}`)).toBeTruthy();
    await waitFor(() => {
      const s = saved();
      expect(s.kids.stars).toBe(5);
      expect(s.kids.storiesRead).toEqual([first.id]);
      expect(s.progress.minutesToday).toBeGreaterThanOrEqual(1);
    });
  });

  it('relire la même histoire ne la note pas deux fois (mais redonne les étoiles)', async () => {
    mockStore.set('kalam:state:v1', kidsState({}, { storiesRead: [first.id] }));
    await boot();
    await fireEvent.press(await screen.findByLabelText(t('fr', 'stories')));
    await fireEvent.press(await screen.findByLabelText(first.title.fr));
    for (let k = 0; k < first.sentences.length - 1; k++) await fireEvent.press(screen.getByText(t('fr', 'nextSentence')));
    await fireEvent.press(screen.getByText(t('fr', 'finish')));
    await fireEvent.press(await screen.findByText(t('fr', 'back')));
    await waitFor(() => expect(saved().kids.storiesRead).toEqual([first.id]));
  });

  it('quitter la liste des histoires sans lire: aucun temps compté', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await boot();
    await fireEvent.press(await screen.findByLabelText(t('fr', 'stories')));
    await fireEvent.press(await screen.findByText(/Retour/));
    expect(await screen.findByLabelText(t('fr', 'play'))).toBeTruthy();
    await act(async () => {});
    expect(saved().progress?.minutesToday ?? 0).toBe(0);
  });

  it('quitter une histoire en cours: au moins une minute comptée, aucune étoile ni histoire notée', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await boot();
    await fireEvent.press(await screen.findByLabelText(t('fr', 'stories')));
    await fireEvent.press(await screen.findByLabelText(first.title.fr));
    await fireEvent.press(screen.getByText(/Retour/));
    expect(await screen.findByLabelText(`3 ${t('fr', 'stars')}`)).toBeTruthy();
    await waitFor(() => {
      expect(saved().progress.minutesToday).toBeGreaterThanOrEqual(1);
      expect(saved().kids.stars).toBe(3);
      expect(saved().kids.storiesRead).toEqual([]);
    });
  });
});

describe('App: jeu de l\'enfant', () => {
  const topic = KIDS_TOPICS[0];
  const label = (i: number) => pick(topic.items[i], 'fr');

  it('une bonne réponse donne une étoile tout de suite; quitter compte le temps', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await boot();
    await fireEvent.press(await screen.findByLabelText(t('fr', 'play')));
    await fireEvent.press(await screen.findByLabelText(topic.title.fr));
    await fireEvent.press(screen.getByLabelText(label(2))); // faux: pas d'étoile
    await fireEvent.press(screen.getByLabelText(label(0))); // juste
    await waitFor(() => expect(saved().kids.stars).toBe(4));
    await fireEvent.press(screen.getByText(/Retour/));
    expect(await screen.findByLabelText(`4 ${t('fr', 'stars')}`)).toBeTruthy();
    await waitFor(() => expect(saved().progress.minutesToday).toBeGreaterThanOrEqual(1));
  });

  it('quitter le choix du thème sans jouer: aucun temps compté', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await boot();
    await fireEvent.press(await screen.findByLabelText(t('fr', 'play')));
    await fireEvent.press(await screen.findByText(/Retour/));
    await screen.findByLabelText(t('fr', 'stories'));
    await act(async () => {});
    expect(saved().progress?.minutesToday ?? 0).toBe(0);
  });
});

describe('App: limite de temps de l\'enfant', () => {
  it('temps écoulé: ni histoires ni jeu, message calme; autocollants et parents restent', async () => {
    mockStore.set('kalam:state:v1', kidsState({}, { dailyLimit: 10 }, { minutesToday: 10 }));
    await boot();
    expect(await screen.findByText(t('fr', 'timeUpTitle'))).toBeTruthy();
    expect(screen.queryByLabelText(t('fr', 'stories'))).toBeNull();
    expect(screen.queryByLabelText(t('fr', 'play'))).toBeNull();
    await fireEvent.press(screen.getByLabelText(t('fr', 'stickers')));
    expect(await screen.findByText(`🌟 ${t('fr', 'stickers')}`)).toBeTruthy();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(await screen.findByLabelText(t('fr', 'parents'))).toBeTruthy();
  });

  it('avec du temps restant: le temps restant est annoncé et les jeux marchent', async () => {
    mockStore.set('kalam:state:v1', kidsState({}, { dailyLimit: 20 }, { minutesToday: 5 }));
    await boot();
    expect(await screen.findByText(`${t('fr', 'timeLeft')}: 15 ${t('fr', 'minutes')}`)).toBeTruthy();
    expect(screen.getByLabelText(t('fr', 'play'))).toBeTruthy();
  });
});

describe('App: espace parents (réglages enregistrés)', () => {
  beforeEach(() => { jest.spyOn(Math, 'random').mockReturnValue(0); });
  const open = async () => {
    await boot();
    await fireEvent.press(await screen.findByLabelText(t('fr', 'parents')));
    await fireEvent.press(await screen.findByLabelText('36'));
    await screen.findByLabelText(t('fr', 'micConsentTitle'));
  };

  it('donner puis retirer le consentement du micro: date et version conservées, sauvegardé', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await open();
    await fireEvent(screen.getByLabelText(t('fr', 'micConsentTitle')), 'valueChange', true);
    await waitFor(() => expect(saved().kids.consent).toMatchObject({ micAllowed: true, version: 1, grantedAt: expect.any(Number) }));
    expect(saved().kids.consent.grantedAt).toBeGreaterThan(0);
    await fireEvent(screen.getByLabelText(t('fr', 'micConsentTitle')), 'valueChange', false);
    await waitFor(() => expect(saved().kids.consent.micAllowed).toBe(false));
  });

  it('choisir une limite de temps est sauvegardé (10, 30, aucune)', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await open();
    await fireEvent.press(screen.getByText(`10 ${t('fr', 'minutes')}`));
    await waitFor(() => expect(saved().kids.dailyLimit).toBe(10));
    await fireEvent.press(screen.getByText(`30 ${t('fr', 'minutes')}`));
    await waitFor(() => expect(saved().kids.dailyLimit).toBe(30));
    await fireEvent.press(screen.getByText(t('fr', 'noLimit')));
    await waitFor(() => expect(saved().kids.dailyLimit).toBeNull());
  });

  it('« Changer de profil » depuis les parents ramène au choix du profil; les étoiles et les niveaux restent', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await open();
    await fireEvent.press(screen.getByText(t('fr', 'switchProfile')));
    expect(await screen.findByText('Qui va apprendre ?')).toBeTruthy();
    await waitFor(() => expect(saved()).toMatchObject({ profile: null, levels: { en: 'A1' }, kids: { stars: 3 } }));
  });

  it('la progression de l\'enfant est visible pour les parents', async () => {
    mockStore.set('kalam:state:v1', kidsState({}, { stars: 12, storiesRead: ['a', 'b', 'c'] }, { minutesToday: 7 }));
    await open();
    expect(screen.getByText(`⭐ 12 ${t('fr', 'stars')}`)).toBeTruthy();
    expect(screen.getByText(`📖 ${t('fr', 'storiesRead')}: 3`)).toBeTruthy();
    expect(screen.getByText(`⏱ ${t('fr', 'minutesToday')}: 7`)).toBeTruthy();
  });

  it('retour depuis les parents: accueil enfant', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await open();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(await screen.findByLabelText(t('fr', 'stories'))).toBeTruthy();
  });
});

describe('App: révision espacée de bout en bout', () => {
  const adult = (cards: unknown[]) => JSON.stringify({ profile: 'adult', levels: { en: 'A1' }, uiLang: 'fr', cards, progress: initialProgress(today()) });

  it('réviser des cartes dues: la réponse met à jour la carte, donne des points, et la séance se termine', async () => {
    const due = [newCard('restaurant:0', 0), newCard('restaurant:1', 0)];
    mockStore.set('kalam:state:v1', adult(due));
    await boot();
    await fireEvent.press(await screen.findByText(new RegExp(`^${t('fr', 'review')} \\(2\\)`)));
    await fireEvent.press(await screen.findByText(t('fr', 'reveal')));
    await fireEvent.press(screen.getByText(t('fr', 'easy')));
    await fireEvent.press(screen.getByText(t('fr', 'reveal')));
    await fireEvent.press(screen.getByText(t('fr', 'again')));
    expect(await screen.findByText(`${t('fr', 'reviewDone')} 1/2`)).toBeTruthy();
    await waitFor(() => {
      const s = saved();
      const c0 = s.cards.find((c: { key: string }) => c.key === 'restaurant:0');
      const c1 = s.cards.find((c: { key: string }) => c.key === 'restaurant:1');
      expect(c0.due).toBeGreaterThan(Date.now()); // révisée: repoussée dans le futur
      expect(c1.due).toBeGreaterThan(Date.now());
      expect(c0.ease).toBeGreaterThan(c1.ease); // « facile » augmente la facilité, « à revoir » la baisse
      expect(s.progress.xp).toBeGreaterThan(0);
    });
    await fireEvent.press(screen.getAllByText(t('fr', 'back')).pop()!);
    expect(await screen.findByLabelText(/Kalam\s·\sA1/)).toBeTruthy();
  });

  it('une carte révisée ne revient plus dans la même séance de l\'accueil (compteur à jour)', async () => {
    mockStore.set('kalam:state:v1', adult([newCard('restaurant:0', 0)]));
    await boot();
    await fireEvent.press(await screen.findByText(new RegExp(`^${t('fr', 'review')} \\(1\\)`)));
    await fireEvent.press(await screen.findByText(t('fr', 'reveal')));
    await fireEvent.press(screen.getByText(t('fr', 'good')));
    await fireEvent.press(screen.getAllByText(t('fr', 'back')).pop()!);
    expect(await screen.findByText(t('fr', 'review'))).toBeTruthy();
    expect(screen.queryByText(new RegExp(`^${t('fr', 'review')} \\(`))).toBeNull();
  });
});

describe('App: conversation à deux', () => {
  it('depuis l\'accueil: préparation puis conversation, retour sans plantage', async () => {
    mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'adult', levels: { en: 'A1' }, uiLang: 'fr', progress: initialProgress(today()) }));
    await boot();
    await fireEvent.press(await screen.findByText(new RegExp(t('fr', 'duoTitle'))));
    expect(await screen.findByText(t('fr', 'duoStart'))).toBeTruthy();
    await fireEvent.press(screen.getByText(/Retour/));
    expect(await screen.findByLabelText(/Kalam\s·\sA1/)).toBeTruthy();
  });
});

describe('App: bouton retour physique d\'Android', () => {
  type Handler = () => boolean | null | undefined;
  let handlers: Handler[] = [];
  const pressBack = async (): Promise<boolean> => {
    let handled = false;
    await act(async () => { for (const h of [...handlers].reverse()) { if (h()) { handled = true; break; } } });
    return handled;
  };
  beforeEach(() => {
    handlers = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_n: string, h: Handler) => {
      handlers.push(h);
      return { remove: () => { handlers = handlers.filter((x) => x !== h); } };
    }) as never);
  });
  const adult = JSON.stringify({ profile: 'adult', levels: { en: 'A1' }, uiLang: 'fr', progress: initialProgress(localDay()) });

  it('accueil: le retour n\'est pas intercepté (l\'application peut se fermer)', async () => {
    mockStore.set('kalam:state:v1', adult);
    await boot();
    await screen.findByLabelText(/Kalam\s·\sA1/);
    expect(await pressBack()).toBe(false);
  });

  it('réglages → diagnostic: chaque retour remonte d\'un écran, puis l\'accueil n\'est plus intercepté', async () => {
    mockStore.set('kalam:state:v1', adult);
    await boot();
    await fireEvent.press(await screen.findByLabelText(t('fr', 'settings')));
    await fireEvent.press(await screen.findByText(`🩺 ${t('fr', 'diagnostic')}`));
    expect(await screen.findByText(t('fr', 'diagIntro'))).toBeTruthy();
    expect(await pressBack()).toBe(true);
    expect(await screen.findByText(t('fr', 'switchProfile'))).toBeTruthy(); // retour aux réglages
    expect(await pressBack()).toBe(true);
    expect(await screen.findByLabelText(/Kalam\s·\sA1/)).toBeTruthy(); // accueil
    expect(await pressBack()).toBe(false);
  });

  it('leçon: le retour physique quitte la conversation vers l\'accueil', async () => {
    mockStore.set('kalam:state:v1', adult);
    await boot();
    await fireEvent.press(await screen.findByText(/▶ Continuer: /));
    expect(await screen.findByText(t('fr', 'finish'))).toBeTruthy();
    expect(await pressBack()).toBe(true);
    expect(await screen.findByLabelText(/Kalam\s·\sA1/)).toBeTruthy();
  });

  it('révision et conversation à deux: retour vers l\'accueil', async () => {
    mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'adult', levels: { en: 'A1' }, uiLang: 'fr', cards: [newCard('restaurant:0', 0)], progress: initialProgress(localDay()) }));
    await boot();
    await fireEvent.press(await screen.findByText(new RegExp(`^${t('fr', 'review')} \\(1\\)`)));
    expect(await screen.findByText(t('fr', 'reveal'))).toBeTruthy();
    expect(await pressBack()).toBe(true);
    await fireEvent.press(await screen.findByText(new RegExp(t('fr', 'duoTitle'))));
    expect(await screen.findByText(t('fr', 'duoStart'))).toBeTruthy();
    expect(await pressBack()).toBe(true);
    expect(await screen.findByLabelText(/Kalam\s·\sA1/)).toBeTruthy();
  });

  it('enfant: histoire en cours → retour compte le temps comme le bouton; liste → aucun temps; espace parents → accueil enfant', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await boot();
    await fireEvent.press(await screen.findByLabelText(t('fr', 'stories')));
    await screen.findByLabelText(STORIES[0].title.fr);
    expect(await pressBack()).toBe(true); // liste des histoires: 0 minute
    expect(await screen.findByLabelText(t('fr', 'play'))).toBeTruthy();
    await act(async () => {});
    expect(saved().progress?.minutesToday ?? 0).toBe(0);
    await fireEvent.press(screen.getByLabelText(t('fr', 'stories')));
    await fireEvent.press(await screen.findByLabelText(STORIES[0].title.fr));
    expect(await pressBack()).toBe(true); // histoire en cours: au moins une minute
    expect(await screen.findByLabelText(`3 ${t('fr', 'stars')}`)).toBeTruthy();
    await waitFor(() => expect(saved().progress.minutesToday).toBeGreaterThanOrEqual(1));
    await fireEvent.press(screen.getByLabelText(t('fr', 'parents')));
    expect(await screen.findByText(new RegExp(t('fr', 'gateTitle')))).toBeTruthy(); // portail parental affiché
    expect(await pressBack()).toBe(true);
    expect(await screen.findByLabelText(t('fr', 'stories'))).toBeTruthy();
  });

  it('enfant: fin d\'histoire puis retour physique: l\'histoire est validée (étoiles et « lue » conservées)', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await boot();
    const first = STORIES[0];
    await fireEvent.press(await screen.findByLabelText(t('fr', 'stories')));
    await fireEvent.press(await screen.findByLabelText(first.title.fr));
    for (let k = 0; k < first.sentences.length - 1; k++) await fireEvent.press(screen.getByText(t('fr', 'nextSentence')));
    await fireEvent.press(screen.getByText(t('fr', 'finish')));
    await screen.findByText(t('fr', 'storyDone'));
    expect(await pressBack()).toBe(true);
    expect(await screen.findByLabelText(`5 ${t('fr', 'stars')}`)).toBeTruthy();
    await waitFor(() => expect(saved().kids.storiesRead).toEqual([first.id]));
  });

  it('enfant: jeu → retour physique: temps compté et accueil enfant; autocollants → accueil enfant', async () => {
    mockStore.set('kalam:state:v1', kidsState());
    await boot();
    await fireEvent.press(await screen.findByLabelText(t('fr', 'play')));
    await fireEvent.press(await screen.findByLabelText(KIDS_TOPICS[0].title.fr));
    expect(await pressBack()).toBe(true);
    expect(await screen.findByLabelText(t('fr', 'stickers'))).toBeTruthy();
    await waitFor(() => expect(saved().progress.minutesToday).toBeGreaterThanOrEqual(1));
    await fireEvent.press(screen.getByLabelText(t('fr', 'stickers')));
    expect(await screen.findByText(`🌟 ${t('fr', 'stickers')}`)).toBeTruthy();
    expect(await pressBack()).toBe(true);
    expect(await screen.findByLabelText(t('fr', 'parents'))).toBeTruthy();
  });

  it('test de niveau: le retour physique revient au choix du profil; niveaux et langue apprise conservés', async () => {
    mockStore.set('kalam:state:v1', JSON.stringify({ profile: 'adult', levels: { en: 'A2' }, targetLang: 'fr', uiLang: 'fr', progress: initialProgress(localDay()) }));
    await boot();
    expect(await screen.findByText('Elle ___ professeur.')).toBeTruthy(); // pas de niveau en français: test de niveau
    expect(await pressBack()).toBe(true);
    expect(await screen.findByText('Qui va apprendre ?')).toBeTruthy();
    await waitFor(() => expect(saved()).toMatchObject({ profile: null, targetLang: 'fr', levels: { en: 'A2' } }));
    expect(await pressBack()).toBe(false); // choix du profil: l'application peut se fermer
  });
});

describe('App: langue au premier lancement', () => {
  const device = deviceUiLang as unknown as jest.Mock;
  afterEach(() => { device.mockImplementation(() => 'fr'); });

  it('premier lancement: l\'interface suit la langue du téléphone (espagnol, arabe, chinois, anglais)', async () => {
    for (const [lang, welcome] of [['es', t('es', 'welcome')], ['ar', t('ar', 'welcome')], ['zh', t('zh', 'welcome')], ['en', t('en', 'welcome')]] as const) {
      device.mockImplementation(() => lang);
      mockStore.clear();
      await boot();
      expect(await screen.findByText(welcome)).toBeTruthy();
      await cleanup();
    }
  });

  it('le choix enregistré prime toujours sur la langue du téléphone', async () => {
    device.mockImplementation(() => 'es');
    mockStore.set('kalam:state:v1', JSON.stringify({ profile: null, uiLang: 'fr' }));
    await boot();
    expect(await screen.findByText(t('fr', 'welcome'))).toBeTruthy();
  });

  it('changer de langue dans l\'app est sauvegardé, et persiste même si le téléphone change de langue', async () => {
    device.mockImplementation(() => 'es');
    await boot();
    await screen.findByText(t('es', 'welcome'));
    await fireEvent.press(screen.getByLabelText('English'));
    await waitFor(() => expect(saved().uiLang).toBe('en'));
    await cleanup();
    device.mockImplementation(() => 'zh');
    await boot();
    expect(await screen.findByText(t('en', 'welcome'))).toBeTruthy();
  });
});
