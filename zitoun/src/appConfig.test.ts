import appJson from '../app.json';

/* eslint-disable @typescript-eslint/no-require-imports */
const { resolveAppId } = require('../scripts/appId') as { resolveAppId: (v: unknown, fallback: string) => string };
const makeConfig = require('../app.config') as (a: { config: Record<string, any> }) => any;
/* eslint-enable @typescript-eslint/no-require-imports */

const expo = appJson.expo as unknown as { name: string; version: string; userInterfaceStyle?: string; ios?: unknown; android: { package: string; versionCode: number; blockedPermissions: string[]; permissions?: string[]; allowBackup: boolean }; plugins: unknown[] };

describe('configuration (app.json)', () => {
  it('identité Android: nom, identifiant propre au propriétaire (jamais un exemple), version', () => {
    expect(expo.name).toBe('Zitoun');
    expect(expo.android.package).toBe('com.faridchakour.zitoun');
    expect(expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(expo.android.versionCode).toBeGreaterThanOrEqual(1);
    expect(expo.ios).toBeUndefined(); // Android seulement
  });
  it('thème automatique, sauvegarde cloud désactivée (les adresses des clients restent sur le téléphone)', () => {
    expect(expo.userInterfaceStyle).toBe('automatic');
    expect(expo.android.allowBackup).toBe(false);
  });
  it('permissions: aucune demandée; celles que les bibliothèques ajoutent par défaut sont bloquées', () => {
    expect(expo.android.permissions ?? []).toEqual([]);
    for (const p of ['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.VIBRATE']) expect(expo.android.blockedPermissions).toContain(p);
  });
  it('aucun plugin de micro, caméra, localisation ou notifications', () => {
    expect(JSON.stringify(expo.plugins)).not.toMatch(/speech|notifications|camera|location|contacts/i);
  });
});

describe('identifiant d\'application réglable (ZITOUN_APP_ID)', () => {
  const old = process.env.ZITOUN_APP_ID;
  afterEach(() => { if (old === undefined) delete process.env.ZITOUN_APP_ID; else process.env.ZITOUN_APP_ID = old; });
  it('absent ou vide: valeur par défaut; valide: appliqué sans toucher au reste', () => {
    for (const v of [undefined, '', '   ', null, 5]) expect(resolveAppId(v, 'a.b')).toBe('a.b');
    process.env.ZITOUN_APP_ID = 'ma.monshop.zitoun';
    const out = makeConfig({ config: expo as never });
    expect(out.android.package).toBe('ma.monshop.zitoun');
    expect(out.android.blockedPermissions).toEqual(expo.android.blockedPermissions);
    expect(out.name).toBe('Zitoun');
  });
  it('mal formé ou mot réservé de Java: refusé avec un message clair', () => {
    for (const bad of ['zitoun', 'com..zitoun', 'com.zitoun.', '1com.zitoun', 'com.zi-toun', 'com.zitoun;rm', 'com.example.new', 'com.zitoun.class']) expect(() => resolveAppId(bad, 'a.b')).toThrow(/ZITOUN_APP_ID invalide/);
  });
});
