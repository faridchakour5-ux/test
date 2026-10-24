import { act, cleanup, render } from '@testing-library/react-native';
import React from 'react';
import { BackHandler } from 'react-native';
import { useHardwareBack } from './useHardwareBack';

// Faux BackHandler: comme sur Android, le dernier abonné est appelé en premier, et « true » arrête la remontée.
type Handler = () => boolean | null | undefined;
let handlers: Handler[] = [];
const removed = jest.fn();
const pressBack = (): boolean => { for (const h of [...handlers].reverse()) { if (h()) return true; } return false; };

beforeEach(() => {
  handlers = []; removed.mockClear();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_name: string, h: Handler) => {
    handlers.push(h);
    return { remove: () => { handlers = handlers.filter((x) => x !== h); removed(); } };
  }) as never);
});
afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });

function Screen({ onBack, enabled }: { onBack: () => void; enabled?: boolean }) { useHardwareBack(onBack, enabled); return null; }

describe('useHardwareBack', () => {
  it('le retour physique appelle l\'action de l\'écran et empêche la fermeture de l\'application', async () => {
    const onBack = jest.fn();
    await render(<Screen onBack={onBack} />);
    expect(pressBack()).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('sans écran enregistré (accueil): le retour n\'est pas intercepté, l\'application peut se fermer', async () => {
    expect(pressBack()).toBe(false);
    const view = await render(<Screen onBack={jest.fn()} />);
    await view.unmount();
    expect(pressBack()).toBe(false);
  });

  it('à la fermeture de l\'écran, l\'abonnement est retiré (aucune fuite)', async () => {
    const view = await render(<Screen onBack={jest.fn()} />);
    expect(handlers).toHaveLength(1);
    await view.unmount();
    expect(handlers).toHaveLength(0);
    expect(removed).toHaveBeenCalledTimes(1);
  });

  it('c\'est toujours la DERNIÈRE action qui est appelée, sans se réabonner à chaque rendu', async () => {
    const first = jest.fn(); const second = jest.fn();
    const view = await render(<Screen onBack={first} />);
    await view.rerender(<Screen onBack={second} />);
    expect(handlers).toHaveLength(1);
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
    pressBack();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('deux écrans empilés: seul le dernier réagit', async () => {
    const below = jest.fn(); const top = jest.fn();
    await render(<><Screen onBack={below} /><Screen onBack={top} /></>);
    pressBack();
    expect(top).toHaveBeenCalledTimes(1);
    expect(below).not.toHaveBeenCalled();
  });

  it('désactivé: aucun abonnement; réactivé: abonnement', async () => {
    const view = await render(<Screen onBack={jest.fn()} enabled={false} />);
    expect(handlers).toHaveLength(0);
    await view.rerender(<Screen onBack={jest.fn()} enabled />);
    expect(handlers).toHaveLength(1);
    await act(async () => { await view.rerender(<Screen onBack={jest.fn()} enabled={false} />); });
    expect(handlers).toHaveLength(0);
  });
});
