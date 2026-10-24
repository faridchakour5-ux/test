import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { TARGET_LANGS, TARGET_NAMES } from '../domain/targets';
import { LANG_NAMES, UI_LANGS, t } from '../i18n/strings';
import { PALETTE_DICTIONARY, PALETTE_IDS } from '../theme/palettes';
import { ThemeProvider } from '../theme/ThemeProvider';
import { BackButton } from './BackButton';
import { LanguagePicker } from './LanguagePicker';
import { PalettePicker } from './PalettePicker';
import { TargetPicker } from './TargetPicker';

afterEach(async () => { await cleanup(); });
const wrap = (el: React.ReactElement, profileId: 'adult' | 'kids' | 'senior' = 'adult') => render(<ThemeProvider profileId={profileId}>{el}</ThemeProvider>);

describe('choix de la langue de l\'interface', () => {
  it('une entrée par langue, nommée dans sa propre langue; la langue actuelle est cochée et marquée', async () => {
    await wrap(<LanguagePicker value="es" onChange={jest.fn()} />);
    for (const l of UI_LANGS) {
      const b = screen.getByLabelText(LANG_NAMES[l]);
      expect(b).toHaveProp('accessibilityState', { selected: l === 'es' });
    }
    expect(screen.getByText(`✓ ${LANG_NAMES.es}`)).toBeTruthy();
    expect(screen.queryByText(`✓ ${LANG_NAMES.fr}`)).toBeNull();
    expect(screen.getByRole('header', { name: `🌐 ${t('es', 'language')}` })).toBeTruthy();
  });

  it('chaque langue envoie son identifiant', async () => {
    const onChange = jest.fn();
    await wrap(<LanguagePicker value="fr" onChange={onChange} />);
    for (const l of UI_LANGS) await fireEvent.press(screen.getByLabelText(LANG_NAMES[l]));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([...UI_LANGS]);
  });

  it('passer à l\'arabe (sens de lecture inverse) demande de relancer l\'app; les autres langues non', async () => {
    await wrap(<LanguagePicker value="ar" onChange={jest.fn()} />);
    expect(screen.getByText(t('ar', 'restartRtl'))).toBeTruthy();
    await cleanup();
    for (const l of ['fr', 'en', 'es', 'zh'] as const) {
      await wrap(<LanguagePicker value={l} onChange={jest.fn()} />);
      expect(screen.queryByText(t(l, 'restartRtl'))).toBeNull();
      await cleanup();
    }
  });
});

describe('choix de la langue à apprendre', () => {
  it('anglais et français, cochés comme boutons radio, avec nom dans la langue de l\'interface', async () => {
    await wrap(<TargetPicker lang="fr" value="fr" onChange={jest.fn()} />);
    for (const tl of TARGET_LANGS) {
      const label = `${t('fr', 'learnLang')}: ${TARGET_NAMES.fr[tl]}`;
      expect(screen.getByLabelText(label)).toHaveProp('accessibilityState', { checked: tl === 'fr' });
    }
    expect(screen.getByText(`✓ ${TARGET_NAMES.fr.fr}`)).toBeTruthy();
    expect(screen.queryByText(`✓ ${TARGET_NAMES.fr.en}`)).toBeNull();
    expect(screen.getByRole('header', { name: `🎓 ${t('fr', 'learnLang')}` })).toBeTruthy();
  });

  it('choisir envoie la langue; le nom suit la langue de l\'interface', async () => {
    const onChange = jest.fn();
    await wrap(<TargetPicker lang="es" value="en" onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText(`${t('es', 'learnLang')}: ${TARGET_NAMES.es.fr}`));
    expect(onChange).toHaveBeenCalledWith('fr');
    await fireEvent.press(screen.getByLabelText(`${t('es', 'learnLang')}: ${TARGET_NAMES.es.en}`));
    expect(onChange).toHaveBeenLastCalledWith('en');
  });
});

describe('choix des couleurs', () => {
  it('une entrée par palette, nommée dans la langue; l\'actuelle est cochée', async () => {
    await wrap(<PalettePicker lang="fr" value="ocean" onChange={jest.fn()} />);
    for (const id of PALETTE_IDS) {
      expect(screen.getByLabelText(PALETTE_DICTIONARY[id].name.fr)).toHaveProp('accessibilityState', { selected: id === 'ocean' });
    }
    expect(screen.getByText(`✓ ${PALETTE_DICTIONARY.ocean.name.fr}`)).toBeTruthy();
    expect(screen.getAllByText(/^✓ /)).toHaveLength(1);
    expect(screen.getByText(t('fr', 'colors'))).toBeTruthy();
  });

  it('chaque palette envoie son identifiant', async () => {
    const onChange = jest.fn();
    await wrap(<PalettePicker lang="fr" value="violet" onChange={onChange} />);
    for (const id of PALETTE_IDS) await fireEvent.press(screen.getByLabelText(PALETTE_DICTIONARY[id].name.fr));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([...PALETTE_IDS]);
  });

  it.each(UI_LANGS)('noms de palettes disponibles en %s', async (lang) => {
    await wrap(<PalettePicker lang={lang} value="violet" onChange={jest.fn()} />);
    for (const id of PALETTE_IDS) expect(screen.getByLabelText(PALETTE_DICTIONARY[id].name[lang])).toBeTruthy();
  });
});

describe('bouton retour', () => {
  it('nommé « Retour » pour les lecteurs d\'écran, dans la langue, et appelle l\'action', async () => {
    const onPress = jest.fn();
    await wrap(<BackButton lang="en" onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText(t('en', 'back')));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText(`← ${t('en', 'back')}`)).toBeTruthy();
  });

  it('grande zone tactile pour les profils enfant et senior', async () => {
    await wrap(<BackButton lang="fr" onPress={jest.fn()} />, 'senior');
    expect(screen.getByLabelText(t('fr', 'back'))).toHaveStyle({ minHeight: 64 });
  });
});
