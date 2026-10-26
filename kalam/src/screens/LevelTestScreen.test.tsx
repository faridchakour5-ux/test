import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
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

describe('LevelTestScreen: double appui', () => {
  afterEach(async () => { await cleanup(); });
  it('un double appui sur la dernière réponse ne valide le test qu\'une fois', async () => {
    const onDone = jest.fn();
    await render(ui(onDone));
    const total = PLACEMENTS.en.length;
    for (let i = 0; i < total - 1; i++) await fireEvent.press(screen.getAllByRole('button')[0]);
    const last = screen.getAllByRole('button')[0];
    await act(async () => { void fireEvent.press(last); void fireEvent.press(last); }); // deux appuis dans le même instant
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it('« Passer » deux fois de suite: une seule validation', async () => {
    const onDone = jest.fn();
    await render(ui(onDone));
    const skip = screen.getByLabelText('Passer');
    await act(async () => { void fireEvent.press(skip); void fireEvent.press(skip); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
