import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';

let shouldCrash = true;
function Bomb() {
  if (shouldCrash) throw new Error('boom');
  return <Text>tout va bien</Text>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => { jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('affiche un écran de secours au lieu de planter, puis permet de réessayer', async () => {
    const onError = jest.fn();
    shouldCrash = true;
    await render(<ErrorBoundary onError={onError}><Bomb /></ErrorBoundary>);
    expect(screen.getByText(/Une erreur est survenue/)).toBeTruthy();
    expect(onError).toHaveBeenCalled();
    shouldCrash = false;
    await fireEvent.press(screen.getByText('Réessayer / Retry'));
    expect(screen.getByText('tout va bien')).toBeTruthy();
  });

  it('laisse passer les enfants quand tout va bien', async () => {
    shouldCrash = false;
    await render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByText('tout va bien')).toBeTruthy();
  });
});
