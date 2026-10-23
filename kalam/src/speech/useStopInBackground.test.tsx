import { render } from '@testing-library/react-native';
import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStopInBackground } from './useStopInBackground';

const mockStop = jest.fn();
const mockCancel = jest.fn();
jest.mock('./tts', () => ({ tts: { stop: (...a: unknown[]) => mockStop(...a) } }));
jest.mock('./recognizer', () => ({ cancelListening: (...a: unknown[]) => mockCancel(...a) }));

let handler: (s: AppStateStatus) => void = () => {};
const remove = jest.fn();

function Probe({ extra }: { extra?: () => void }) {
  useStopInBackground(extra);
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, h) => { handler = h as (s: AppStateStatus) => void; return { remove } as never; });
});
afterEach(() => jest.restoreAllMocks());

describe('useStopInBackground', () => {
  it.each(['background', 'inactive'] as const)('coupe le micro et la voix quand l\'app passe en « %s »', async (state) => {
    const extra = jest.fn();
    await render(<Probe extra={extra} />);
    handler(state);
    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(extra).toHaveBeenCalledTimes(1);
  });
  it('ne fait rien quand l\'app revient au premier plan', async () => {
    const extra = jest.fn();
    await render(<Probe extra={extra} />);
    handler('active');
    expect(mockStop).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
    expect(extra).not.toHaveBeenCalled();
  });
  it('appelle toujours la DERNIÈRE version de la fonction de l\'écran (pas une version périmée)', async () => {
    const first = jest.fn(); const second = jest.fn();
    const view = await render(<Probe extra={first} />);
    await view.rerender(<Probe extra={second} />);
    handler('background');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
  it('se désabonne à la fermeture de l\'écran (pas de fuite)', async () => {
    const view = await render(<Probe />);
    await view.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it('fonctionne sans fonction supplémentaire', async () => {
    await render(<Probe />);
    expect(() => handler('background')).not.toThrow();
    expect(mockStop).toHaveBeenCalled();
  });
});
