import appJson from '../app.json';

const expo = appJson.expo as unknown as {
  name: string; slug: string; version: string; scheme?: string; userInterfaceStyle?: string;
  ios?: { bundleIdentifier?: string; buildNumber?: string; infoPlist?: Record<string, unknown> };
  android?: { package?: string; versionCode?: number; blockedPermissions?: string[]; permissions?: string[]; allowBackup?: boolean };
  plugins?: (string | [string, Record<string, string>])[];
};

describe('configuration de l\'application (app.json)', () => {
  it('identité: nom, identifiants de publication et version', () => {
    expect(expo.name).toBe('Kalam');
    expect(expo.android?.package).toBe('com.kalam.app');
    expect(expo.ios?.bundleIdentifier).toBe('com.kalam.app');
    expect(expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(expo.android?.versionCode).toBeGreaterThanOrEqual(1);
  });

  it('thème automatique (clair/sombre)', () => {
    expect(expo.userInterfaceStyle).toBe('automatic');
  });

  describe('permissions Android: le strict nécessaire (Internet, micro, rappel quotidien)', () => {
    const blocked = expo.android?.blockedPermissions ?? [];
    it.each([
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.VIBRATE',
    ])('%s est bloquée (ajoutée par défaut par Expo, jamais utilisée)', (perm) => {
      expect(blocked).toContain(perm);
    });
    it('aucune permission supplémentaire n\'est demandée explicitement', () => {
      expect(expo.android?.permissions ?? []).toEqual([]);
    });
    it('aucune permission bloquée n\'est en même temps demandée', () => {
      const asked = expo.android?.permissions ?? [];
      expect(asked.filter((p) => blocked.includes(p))).toEqual([]);
    });
  });

  describe('micro et reconnaissance vocale', () => {
    const entry = (expo.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-speech-recognition') as [string, Record<string, string>] | undefined;
    it('le plugin est configuré avec des textes d\'explication pour le micro et la reconnaissance vocale', () => {
      expect(entry).toBeDefined();
      expect(entry?.[1].microphonePermission?.length).toBeGreaterThan(20);
      expect(entry?.[1].speechRecognitionPermission?.length).toBeGreaterThan(20);
    });
    it('les textes expliquent l\'usage (prononciation), sans promesse fausse', () => {
      expect(entry?.[1].microphonePermission).toMatch(/prononciation/i);
    });
  });

  describe('rappel quotidien (notifications locales)', () => {
    const entry = (expo.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-notifications') as [string, { icon?: string; color?: string }] | undefined;
    it('le plugin est configuré avec une icône monochrome et une couleur (la petite icône Android n\'est pas un carré blanc)', () => {
      expect(entry).toBeDefined();
      expect(entry?.[1].icon).toMatch(/monochrome/);
      expect(entry?.[1].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
    it('l\'icône existe dans le dépôt', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path');
      expect(fs.existsSync(path.join(__dirname, '..', entry?.[1].icon ?? 'absent'))).toBe(true);
    });
  });

  it('écran de lancement configuré pour le clair et le sombre', () => {
    const splash = (expo.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') as [string, { backgroundColor?: string; dark?: { backgroundColor?: string } }] | undefined;
    expect(splash?.[1].backgroundColor).toBeTruthy();
    expect(splash?.[1].dark?.backgroundColor).toBeTruthy();
  });

  describe('confidentialité: les données restent sur l\'appareil', () => {
    it('la sauvegarde automatique d\'Android est désactivée (conversations et consentement parental ne partent pas vers le compte Google)', () => {
      expect(expo.android?.allowBackup).toBe(false);
    });
  });

  describe('iOS', () => {
    it('déclare ne pas utiliser de chiffrement non exempté (HTTPS seulement), pour éviter la question à chaque envoi', () => {
      expect(expo.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
    });
    it('a un numéro de build', () => {
      expect(expo.ios?.buildNumber).toMatch(/^\d+$/);
    });
  });
});
