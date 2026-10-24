import appJson from '../app.json';

/* eslint-disable @typescript-eslint/no-require-imports */
const { resolveAppId } = require('../scripts/appId') as { resolveAppId: (v: unknown, fallback: string) => string };
const makeConfig = require('../app.config') as (a: { config: Record<string, any> }) => any;
/* eslint-enable @typescript-eslint/no-require-imports */

describe('identifiant d\'application réglable (KALAM_APP_ID)', () => {
  it('absent, vide ou espaces: valeur par défaut', () => {
    for (const v of [undefined, '', '   ', null, 5]) expect(resolveAppId(v, 'com.kalam.app')).toBe('com.kalam.app');
  });
  it('identifiants valides acceptés (espaces autour retirés)', () => {
    expect(resolveAppId('com.votrenom.kalam', 'x.y')).toBe('com.votrenom.kalam');
    expect(resolveAppId('  fr.exemple.kalam_app2 ', 'x.y')).toBe('fr.exemple.kalam_app2');
    expect(resolveAppId('Com.Exemple.App', 'x.y')).toBe('Com.Exemple.App');
  });
  it('identifiants refusés avec un message clair', () => {
    for (const bad of ['kalam', 'com..kalam', 'com.kalam.', '.com.kalam', '1com.kalam', 'com.1kalam', 'com.ka-lam', 'com.ka lam', 'com.kalam;rm', `com.${'a'.repeat(200)}`]) {
      expect(() => resolveAppId(bad, 'x.y')).toThrow(/KALAM_APP_ID invalide/);
    }
  });
});

describe('app.config.js', () => {
  const base = appJson.expo as unknown as Record<string, any>;
  const old = process.env.KALAM_APP_ID;
  afterEach(() => { if (old === undefined) delete process.env.KALAM_APP_ID; else process.env.KALAM_APP_ID = old; });

  it('sans variable: la configuration de app.json est inchangée', () => {
    delete process.env.KALAM_APP_ID;
    const out = makeConfig({ config: base });
    expect(out.android.package).toBe('com.kalam.app');
    expect(out.ios.bundleIdentifier).toBe('com.kalam.app');
    expect(out).toEqual(base);
  });
  it('avec la variable: Android ET iOS prennent le même identifiant, le reste ne bouge pas', () => {
    process.env.KALAM_APP_ID = 'com.votrenom.kalam';
    const out = makeConfig({ config: base });
    expect(out.android.package).toBe('com.votrenom.kalam');
    expect(out.ios.bundleIdentifier).toBe('com.votrenom.kalam');
    expect(out.android.blockedPermissions).toEqual(base.android.blockedPermissions);
    expect(out.android.versionCode).toBe(base.android.versionCode);
    expect(out.ios.buildNumber).toBe(base.ios.buildNumber);
    expect(out.name).toBe('Kalam');
  });
  it('variable mal formée: la construction échoue au lieu de produire un identifiant refusé par le store', () => {
    process.env.KALAM_APP_ID = 'pas un identifiant';
    expect(() => makeConfig({ config: base })).toThrow(/KALAM_APP_ID invalide/);
  });
});
