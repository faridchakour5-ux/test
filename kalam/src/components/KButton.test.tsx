import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { KButton } from './KButton';
import { ThemeProvider } from '../theme/ThemeProvider';

const wrap = (node: React.ReactNode) => <ThemeProvider profileId="senior">{node}</ThemeProvider>;

describe('KButton', () => {
  it('un libellé long qui passe sur plusieurs lignes reste centré', async () => {
    await render(wrap(<KButton label="▶ Continuer: un titre de leçon vraiment très long" onPress={() => {}} />));
    expect(screen.getByText(/Continuer/)).toHaveStyle({ textAlign: 'center' });
  });

  it('principal: fond plein; secondaire: sans fond, avec bordure', async () => {
    await render(wrap(<><KButton label="Principal" onPress={() => {}} /><KButton variant="secondary" label="Secondaire" onPress={() => {}} /></>));
    expect(screen.getByLabelText('Secondaire')).toHaveStyle({ backgroundColor: 'transparent', borderWidth: 2 });
    expect(screen.getByLabelText('Principal')).not.toHaveStyle({ backgroundColor: 'transparent' });
  });

  it('appelle onPress', async () => {
    const onPress = jest.fn();
    await render(wrap(<KButton label="Go" onPress={onPress} />));
    await fireEvent.press(screen.getByLabelText('Go'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
