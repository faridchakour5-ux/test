import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { STICKERS } from '../domain/kids';
import { UI_LANGS, t } from '../i18n/strings';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AgeProfileId } from '../theme/profiles';
import { KidsHomeScreen } from './KidsHomeScreen';
import { ProfilePickerScreen } from './ProfilePickerScreen';
import { StickersScreen } from './StickersScreen';

afterEach(async () => { await cleanup(); });

type KidsProps = Partial<React.ComponentProps<typeof KidsHomeScreen>>;
const kidsHome = (p: KidsProps = {}) => render(
  <ThemeProvider profileId="kids">
    <KidsHomeScreen lang="fr" stars={5} minutesToday={0} dailyLimit={null} onStories={jest.fn()} onPlay={jest.fn()} onStickers={jest.fn()} onParents={jest.fn()} {...p} />
  </ThemeProvider>,
);

describe('accueil enfant', () => {
  it('étoiles lisibles à voix haute, trois entrées, accès parents discret', async () => {
    const h = { onStories: jest.fn(), onPlay: jest.fn(), onStickers: jest.fn(), onParents: jest.fn() };
    await kidsHome(h);
    expect(screen.getByLabelText(`5 ${t('fr', 'stars')}`)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(t('fr', 'stories')));
    await fireEvent.press(screen.getByLabelText(t('fr', 'play')));
    await fireEvent.press(screen.getByLabelText(t('fr', 'stickers')));
    await fireEvent.press(screen.getByLabelText(t('fr', 'parents')));
    expect(h.onStories).toHaveBeenCalledTimes(1);
    expect(h.onPlay).toHaveBeenCalledTimes(1);
    expect(h.onStickers).toHaveBeenCalledTimes(1);
    expect(h.onParents).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('header', { name: 'Kalam' })).toBeTruthy();
  });

  it('sans limite: pas de compte à rebours', async () => {
    await kidsHome({ dailyLimit: null, minutesToday: 500 });
    expect(screen.queryByText(new RegExp(t('fr', 'timeLeft')))).toBeNull();
    expect(screen.getByLabelText(t('fr', 'play'))).toBeTruthy();
    expect(screen.queryByText(t('fr', 'timeUpTitle'))).toBeNull();
  });

  it('avec une limite: temps restant exact, jeux encore disponibles', async () => {
    await kidsHome({ dailyLimit: 20, minutesToday: 5 });
    expect(screen.getByText(`${t('fr', 'timeLeft')}: 15 ${t('fr', 'minutes')}`)).toBeTruthy();
    expect(screen.getByLabelText(t('fr', 'stories'))).toBeTruthy();
    expect(screen.getByLabelText(t('fr', 'play'))).toBeTruthy();
  });

  it('une minute avant la limite: encore possible; à la limite pile: fini', async () => {
    await kidsHome({ dailyLimit: 10, minutesToday: 9 });
    expect(screen.getByText(`${t('fr', 'timeLeft')}: 1 ${t('fr', 'minutes')}`)).toBeTruthy();
    expect(screen.queryByText(t('fr', 'timeUpTitle'))).toBeNull();
    await cleanup();
    await kidsHome({ dailyLimit: 10, minutesToday: 10 });
    expect(screen.getByText(t('fr', 'timeUpTitle'))).toBeTruthy();
    expect(screen.getByText(t('fr', 'timeUpBody'))).toBeTruthy();
    expect(screen.queryByLabelText(t('fr', 'stories'))).toBeNull();
    expect(screen.queryByLabelText(t('fr', 'play'))).toBeNull();
    expect(screen.queryByText(new RegExp(t('fr', 'timeLeft')))).toBeNull();
  });

  it('temps écoulé: les autocollants et l\'accès parents restent disponibles (rien n\'est retiré à l\'enfant)', async () => {
    const h = { onStickers: jest.fn(), onParents: jest.fn() };
    await kidsHome({ dailyLimit: 10, minutesToday: 60, ...h });
    await fireEvent.press(screen.getByLabelText(t('fr', 'stickers')));
    await fireEvent.press(screen.getByLabelText(t('fr', 'parents')));
    expect(h.onStickers).toHaveBeenCalledTimes(1);
    expect(h.onParents).toHaveBeenCalledTimes(1);
  });

  it('temps de jeu dépassé: l\'annonce est une zone vivante (lue par le lecteur d\'écran)', async () => {
    await kidsHome({ dailyLimit: 10, minutesToday: 11 });
    let node = screen.getByText(t('fr', 'timeUpTitle')).parent;
    let live: unknown;
    while (node && live === undefined) { live = node.props?.accessibilityLiveRegion; node = node.parent; }
    expect(live).toBe('polite');
  });
});

describe('autocollants', () => {
  const lockedLabel = (need: number, stars: number) => `${need - stars} ${t('fr', 'stars')} ${t('fr', 'locked')}`;
  const stickers = (stars: number, onBack = jest.fn()) => render(<ThemeProvider profileId="kids"><StickersScreen lang="fr" stars={stars} onBack={onBack} /></ThemeProvider>);

  it('aucune étoile: tout est verrouillé, avec le nombre d\'étoiles qui manquent', async () => {
    await stickers(0);
    for (const s of STICKERS) expect(screen.getByLabelText(lockedLabel(s.stars, 0))).toBeTruthy();
    expect(screen.queryByText(STICKERS[0].emoji)).toBeNull();
    expect(screen.getAllByText('🔒')).toHaveLength(STICKERS.length);
  });

  it('exactement au seuil: l\'autocollant est ouvert; juste en dessous: verrouillé', async () => {
    await stickers(STICKERS[0].stars);
    expect(screen.getByLabelText(STICKERS[0].id)).toBeTruthy();
    expect(screen.getByText(STICKERS[0].emoji)).toBeTruthy();
    expect(screen.getByLabelText(lockedLabel(STICKERS[1].stars, STICKERS[0].stars))).toBeTruthy();
    await cleanup();
    await stickers(STICKERS[0].stars - 1);
    expect(screen.queryByLabelText(STICKERS[0].id)).toBeNull();
    expect(screen.getByLabelText(lockedLabel(STICKERS[0].stars, STICKERS[0].stars - 1))).toBeTruthy();
  });

  it('beaucoup d\'étoiles: tout est ouvert', async () => {
    await stickers(1000);
    for (const s of STICKERS) { expect(screen.getByLabelText(s.id)).toBeTruthy(); expect(screen.getByText(s.emoji)).toBeTruthy(); }
    expect(screen.queryByText('🔒')).toBeNull();
  });

  it('les seuils vont croissants et affichent l\'étoile à atteindre', async () => {
    for (let i = 1; i < STICKERS.length; i++) expect(STICKERS[i].stars).toBeGreaterThan(STICKERS[i - 1].stars);
    await stickers(0);
    expect(screen.getByText(`${STICKERS[0].stars} ⭐`)).toBeTruthy();
    expect(screen.getByText('⭐ 0')).toBeTruthy();
  });

  it('retour', async () => {
    const onBack = jest.fn();
    await stickers(0, onBack);
    await fireEvent.press(screen.getByText(/Retour/));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('choix du profil', () => {
  const picker = (lang: (typeof UI_LANGS)[number] = 'fr', over: Partial<React.ComponentProps<typeof ProfilePickerScreen>> = {}) => render(
    <ThemeProvider profileId="adult">
      <ProfilePickerScreen lang={lang} onPick={jest.fn()} onLang={jest.fn()} target="en" onTarget={jest.fn()} {...over} />
    </ThemeProvider>,
  );

  it('trois profils, chacun envoie le bon identifiant', async () => {
    const onPick = jest.fn<void, [AgeProfileId]>();
    await picker('fr', { onPick });
    await fireEvent.press(screen.getByText(t('fr', 'kids')));
    await fireEvent.press(screen.getByText(t('fr', 'adult')));
    await fireEvent.press(screen.getByText(t('fr', 'senior')));
    expect(onPick.mock.calls.map((c) => c[0])).toEqual(['kids', 'adult', 'senior']);
  });

  it('titre, accroche et consigne affichés; langue d\'interface et langue apprise modifiables', async () => {
    const onLang = jest.fn(); const onTarget = jest.fn();
    await picker('fr', { onLang, onTarget });
    expect(screen.getByRole('header', { name: t('fr', 'welcome') })).toBeTruthy();
    expect(screen.getByText(t('fr', 'tagline'))).toBeTruthy();
    expect(screen.getByText(t('fr', 'pick'))).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('English'));
    expect(onLang).toHaveBeenCalledWith('en');
    await fireEvent.press(screen.getByLabelText('Français'));
    expect(onLang).toHaveBeenCalledWith('fr');
  });

  it.each(UI_LANGS)('fonctionne en %s (y compris de droite à gauche)', async (lang) => {
    const onPick = jest.fn();
    await picker(lang, { onPick });
    await fireEvent.press(screen.getByText(t(lang, 'adult')));
    expect(onPick).toHaveBeenCalledWith('adult');
    expect(screen.getByRole('header', { name: t(lang, 'welcome') })).toBeTruthy();
  });
});
