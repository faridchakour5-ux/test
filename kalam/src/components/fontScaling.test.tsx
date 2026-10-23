import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { AGE_PROFILES, AgeProfileId } from '../theme/profiles';
import { ThemeProvider } from '../theme/ThemeProvider';
import { KText } from './KText';
import { KButton } from './KButton';
import { DuoSetupScreen } from '../screens/DuoSetupScreen';

const ids: AgeProfileId[] = ['kids', 'adult', 'senior'];

describe('plafond de l\'agrandissement du texte', () => {
  it('chaque profil a un plafond, toujours >= 1 (on n\'empêche jamais d\'agrandir le texte)', () => {
    for (const id of ids) expect(AGE_PROFILES[id].maxSystemFontScale).toBeGreaterThanOrEqual(1.3);
  });
  it('le cumul maximal reste raisonnable: profil × réglage du téléphone <= 2,5', () => {
    for (const id of ids) expect(AGE_PROFILES[id].fontScale * AGE_PROFILES[id].maxSystemFontScale).toBeLessThanOrEqual(2.5);
  });
  it('les seniors (déjà ×1,4) ont un plafond plus bas que les adultes', () => {
    expect(AGE_PROFILES.senior.maxSystemFontScale).toBeLessThan(AGE_PROFILES.adult.maxSystemFontScale);
  });
  it('mais les seniors peuvent toujours agrandir au-delà de leur taille de base', () => {
    expect(AGE_PROFILES.senior.maxSystemFontScale).toBeGreaterThan(1);
  });

  for (const id of ids) {
    it(`KText applique le plafond du profil ${id}`, async () => {
      await render(<ThemeProvider profileId={id}><KText>Bonjour</KText></ThemeProvider>);
      expect(screen.getByText('Bonjour')).toHaveProp('maxFontSizeMultiplier', AGE_PROFILES[id].maxSystemFontScale);
    });
  }
  it('un écran peut imposer son propre plafond (la valeur passée gagne)', async () => {
    await render(<ThemeProvider profileId="adult"><KText maxFontSizeMultiplier={1.1}>Compact</KText></ThemeProvider>);
    expect(screen.getByText('Compact')).toHaveProp('maxFontSizeMultiplier', 1.1);
  });
  it('les boutons (donc leur texte) sont plafonnés aussi', async () => {
    await render(<ThemeProvider profileId="senior"><KButton label="Valider" onPress={() => {}} /></ThemeProvider>);
    expect(screen.getByText('Valider')).toHaveProp('maxFontSizeMultiplier', AGE_PROFILES.senior.maxSystemFontScale);
  });
  it('les champs de saisie sont plafonnés aussi', async () => {
    await render(<ThemeProvider profileId="senior"><DuoSetupScreen lang="fr" onStart={() => {}} onBack={() => {}} /></ThemeProvider>);
    expect(screen.getByLabelText('Prénom de la personne 1')).toHaveProp('maxFontSizeMultiplier', AGE_PROFILES.senior.maxSystemFontScale);
  });
});
