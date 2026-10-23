import appJson from '../app.json';

const expo = appJson.expo as unknown as {
  name: string; slug: string; version: string; scheme?: string; userInterfaceStyle?: string;
  ios?: { bundleIdentifier?: string };
  android?: { package?: string; versionCode?: number; blockedPermissions?: string[]; permissions?: string[] };
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

  describe('permissions Android: le strict nécessaire (Internet et micro)', () => {
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

  it('écran de lancement configuré pour le clair et le sombre', () => {
    const splash = (expo.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') as [string, { backgroundColor?: string; dark?: { backgroundColor?: string } }] | undefined;
    expect(splash?.[1].backgroundColor).toBeTruthy();
    expect(splash?.[1].dark?.backgroundColor).toBeTruthy();
  });
});
