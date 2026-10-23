import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { PLACEMENTS } from '../domain/level';
import { ThemeProvider } from '../theme/ThemeProvider';
import { LevelTestScreen } from './LevelTestScreen';

const run = async (target?: 'en' | 'fr') => {
  const onDone = jest.fn();
  await render(<ThemeProvider profileId="adult"><LevelTestScreen lang="fr" target={target} onDone={onDone} /></ThemeProvider>);
  return onDone;
};

describe('LevelTestScreen', () => {
  it('par défaut: les questions d\'anglais', async () => {
    await run();
    expect(screen.getByText('She ___ a teacher.')).toBeTruthy();
  });
  it('français: les questions de français', async () => {
    await run('fr');
    expect(screen.getByText('Elle ___ professeur.')).toBeTruthy();
    expect(screen.queryByText('She ___ a teacher.')).toBeNull();
  });
  for (const target of ['en', 'fr'] as const) {
    it(`${target}: tout juste donne B1, après 12 questions`, async () => {
      const onDone = await run(target);
      for (const q of PLACEMENTS[target]) {
        await fireEvent.press(screen.getByText(q.prompt)); // la question affichée est bien celle attendue
        await fireEvent.press(screen.getByLabelText(q.options[q.answer]));
      }
      expect(onDone).toHaveBeenCalledWith('B1');
    });
  }
});
