import appJson from '../../app.json';
import { versionLine } from './versionInfo';

describe('ligne de version du diagnostic', () => {
  it('version, système et numéro de système', () => {
    expect(versionLine('1.0.0', 'android', 34)).toBe('Kalam 1.0.0 · android 34');
    expect(versionLine(' 2.1 ', 'ios', '17.2')).toBe('Kalam 2.1 · ios 17.2');
  });
  it('espaces superflus retirés partout (système et numéro aussi)', () => {
    expect(versionLine(' 1.0.0 ', ' android ', ' 34 ')).toBe('Kalam 1.0.0 · android 34');
    expect(versionLine('1.0.0', 'web', '   ')).toBe('Kalam 1.0.0 · web');
  });
  it('valeurs manquantes: jamais « undefined »', () => {
    expect(versionLine('', '', '')).toBe('Kalam ? · ?');
    expect(versionLine('1.0.0', 'web', '')).toBe('Kalam 1.0.0 · web');
  });
  it('la version d\'app.json a un format de version', () => {
    expect(appJson.expo.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
