import React from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import { useKeepAwakeWhile } from './useKeepAwakeWhile';

const mockActivate = jest.fn();
const mockDeactivate = jest.fn();
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: (...a: unknown[]) => mockActivate(...a),
  deactivateKeepAwake: (...a: unknown[]) => mockDeactivate(...a),
}));

function Probe({ on }: { on: boolean }) {
  useKeepAwakeWhile(on);
  return null;
}

beforeEach(() => { jest.clearAllMocks(); mockActivate.mockResolvedValue(undefined); mockDeactivate.mockResolvedValue(undefined); });
afterEach(async () => { await cleanup(); });

describe('écran maintenu allumé pendant le mode mains libres', () => {
  it('inactif: on ne touche à rien', async () => {
    await render(<Probe on={false} />);
    expect(mockActivate).not.toHaveBeenCalled();
    expect(mockDeactivate).not.toHaveBeenCalled();
  });
  it('actif: l\'écran reste allumé, puis revient à la normale quand le mode s\'arrête', async () => {
    const view = await render(<Probe on />);
    expect(mockActivate).toHaveBeenCalledTimes(1);
    expect(mockDeactivate).not.toHaveBeenCalled();
    await view.rerender(<Probe on={false} />);
    expect(mockDeactivate).toHaveBeenCalledTimes(1);
    expect(mockDeactivate).toHaveBeenCalledWith(mockActivate.mock.calls[0][0]); // même étiquette
  });
  it('quitter l\'écran en plein mode mains libres rend aussi l\'écran à son réglage normal', async () => {
    const view = await render(<Probe on />);
    await view.unmount();
    expect(mockDeactivate).toHaveBeenCalledTimes(1);
  });
  it('une erreur du module natif ne casse jamais l\'écran', async () => {
    mockActivate.mockRejectedValue(new Error('indisponible'));
    mockDeactivate.mockRejectedValue(new Error('indisponible'));
    const view = await render(<Probe on />);
    await view.unmount();
    expect(mockActivate).toHaveBeenCalled();
  });
  it('module natif absent: l\'écran reste utilisable, sans erreur', async () => {
    function P() { useKeepAwakeWhile(true, () => null); return null; }
    const view = await render(<P />);
    await view.unmount();
    expect(mockActivate).not.toHaveBeenCalled();
    expect(mockDeactivate).not.toHaveBeenCalled();
  });
  it('arrêt du mode avant la fin de l\'activation: l\'écran est quand même relâché une fois l\'activation terminée', async () => {
    let finish: () => void = () => {};
    mockActivate.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const view = await render(<Probe on />);
    await view.rerender(<Probe on={false} />);
    expect(mockDeactivate).toHaveBeenCalledTimes(1); // relâché tout de suite
    await act(async () => { finish(); });
    expect(mockDeactivate).toHaveBeenCalledTimes(2); // et encore une fois après l'activation tardive
  });
  it('arrêt puis redémarrage rapides: la fin tardive de la 1re activation ne coupe pas la 2e (une étiquette par activation)', async () => {
    const finishers: (() => void)[] = [];
    mockActivate.mockImplementation(() => new Promise<void>((resolve) => { finishers.push(resolve); }));
    const view = await render(<Probe on />);
    await view.rerender(<Probe on={false} />);
    await view.rerender(<Probe on />);
    const [tag1, tag2] = mockActivate.mock.calls.map((c) => c[0]);
    expect(tag1).not.toBe(tag2);
    mockDeactivate.mockClear();
    await act(async () => { finishers[0](); finishers[1](); });
    // la 1re activation est relâchée avec SON étiquette; la 2e (en cours) n'est pas touchée
    expect(mockDeactivate.mock.calls.map((c) => c[0])).toEqual([tag1]);
  });
});
