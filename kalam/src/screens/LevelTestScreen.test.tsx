import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { LevelTestScreen } from './LevelTestScreen';
import { PLACEMENTS } from '../domain/level';
import { ThemeProvider } from '../theme/ThemeProvider';

const ui = (onDone: (l: string) => void) => (
  <ThemeProvider profileId="adult">
    <LevelTestScreen lang="fr" target="en" onDone={onDone as never} />
  </ThemeProvider>
);

describe('LevelTestScreen', () => {
  it('affiche une barre de progression accessible qui avance à chaque réponse', async () => {
    await render(ui(jest.fn()));
    const total = PLACEMENTS.en.length;
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: total, now: 0 });
    await fireEvent.press(screen.getAllByRole('button')[0]);
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: total, now: 1 });
  });

  it('« Passer » est un bouton secondaire (sans fond plein) et donne le niveau A1', async () => {
    const onDone = jest.fn();
    await render(ui(onDone));
    const skip = screen.getByLabelText('Passer');
    expect(skip).toHaveStyle({ backgroundColor: 'transparent' });
    await fireEvent.press(skip);
    expect(onDone).toHaveBeenCalledWith('A1');
  });
});
