import { cleanup, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme/ThemeProvider';
import { PALETTE_DICTIONARY } from '../theme/palettes';
import { AppFrame, TOP_ALREADY_RESERVED, frameInsets } from './AppFrame';

afterEach(async () => { await cleanup(); });

const metrics = (top: number, bottom: number) => ({ insets: { top, bottom, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } });
const show = (top: number, bottom: number) => render(
  <SafeAreaProvider initialMetrics={metrics(top, bottom)}>
    <ThemeProvider profileId="adult"><AppFrame><Text testID="inside">contenu</Text></AppFrame></ThemeProvider>
  </SafeAreaProvider>,
);
const frame = () => screen.getByTestId('app-frame');

describe('frameInsets', () => {
  it('bas: toute la barre de navigation; haut: seulement ce qui dépasse la marge déjà prévue par les écrans', () => {
    expect(TOP_ALREADY_RESERVED).toBe(48);
    expect(frameInsets({ top: 24, bottom: 0 })).toEqual({ paddingTop: 0, paddingBottom: 0 });
    expect(frameInsets({ top: 48, bottom: 34 })).toEqual({ paddingTop: 0, paddingBottom: 34 });
    expect(frameInsets({ top: 59, bottom: 48 })).toEqual({ paddingTop: 11, paddingBottom: 48 });
  });
  it('valeurs négatives ou nulles ignorées', () => {
    expect(frameInsets({ top: -5, bottom: -1 })).toEqual({ paddingTop: 0, paddingBottom: 0 });
  });
});

describe('AppFrame', () => {
  it('réserve le bas (barre de gestes) et la part de haut qui dépasse; fond aux couleurs du thème', async () => {
    await show(59, 34);
    expect(screen.getByText('contenu')).toBeTruthy();
    expect(frame()).toHaveStyle({ flex: 1, paddingTop: 11, paddingBottom: 34, backgroundColor: PALETTE_DICTIONARY.violet.light.background });
  });
  it('sans barre ni encoche: aucune marge ajoutée', async () => {
    await show(0, 0);
    expect(frame()).toHaveStyle({ paddingTop: 0, paddingBottom: 0 });
  });
});
