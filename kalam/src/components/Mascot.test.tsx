import { act, render } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { Mascot } from './Mascot';

describe('Mascot', () => {
  afterEach(() => jest.restoreAllMocks());

  it('anime la mascotte sauf si « réduire les animations » est activé', async () => {
    const loop = jest.spyOn(Animated, 'loop');
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<Mascot mood="happy" />);
    await act(async () => {});
    expect(loop).not.toHaveBeenCalled();
  });

  it('si le téléphone ne répond pas sur ce réglage: pas d\'animation et aucune promesse rejetée', async () => {
    const loop = jest.spyOn(Animated, 'loop');
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('indisponible'));
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    try {
      await render(<Mascot mood="happy" />);
      await act(async () => {});
      await new Promise((r) => setImmediate(r));
      expect(unhandled).not.toHaveBeenCalled();
      expect(loop).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
