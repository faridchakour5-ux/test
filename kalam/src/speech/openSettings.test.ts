import { Linking } from 'react-native';
import { openAppSettings } from './openSettings';

describe('openAppSettings', () => {
  afterEach(() => jest.restoreAllMocks());

  it('ouvre les réglages', async () => {
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await openAppSettings();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('un échec ne fait pas planter (pas de promesse rejetée)', async () => {
    jest.spyOn(Linking, 'openSettings').mockRejectedValue(new Error('indisponible'));
    await expect(openAppSettings()).resolves.toBeUndefined();
  });
});
