/* eslint-disable @typescript-eslint/no-require-imports */
const { patchGradle, missingEnv } = require('../scripts/signRelease');

// Extrait réel du build.gradle produit par « expo prebuild » (SDK 58).
const GRADLE = `    namespace 'com.kalam.app'
    defaultConfig {
        applicationId 'com.kalam.app'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"

        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\\"\${findProperty('reactNativeReleaseLevel') ?: 'stable'}\\""
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
            shrinkResources enableShrinkResources.toBoolean()
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
            def enablePngCrunchInRelease = findProperty('android.enablePngCrunchInReleaseBuilds') ?: 'true'
            crunchPngs enablePngCrunchInRelease.toBoolean()
        }
    }
    packagingOptions {
        jniLibs {
`;
const ENV = {
  KALAM_KEYSTORE_FILE: '/tmp/k.jks', KALAM_KEYSTORE_PASSWORD: 'p1', KALAM_KEY_ALIAS: 'kalam', KALAM_KEY_PASSWORD: 'p2', KALAM_VERSION_CODE: '12',
};

describe('signature de publication (scripts/signRelease.js)', () => {
  it('impose le versionCode et signe le build release avec la clé lue dans l\'environnement', () => {
    const out = patchGradle(GRADLE, ENV);
    expect(out).toContain('versionCode 12');
    expect(out).not.toContain('versionCode 1\n');
    expect(out).toMatch(/release \{\s*storeFile file\(System\.getenv\('KALAM_KEYSTORE_FILE'\)\)/);
    expect(out).toMatch(/release \{[^}]*?signingConfig signingConfigs\.release/);
    // le build de débogage garde sa signature de débogage
    expect(out).toMatch(/debug \{\s*signingConfig signingConfigs\.debug/);
  });
  it('n\'écrit jamais les mots de passe dans le fichier (ils restent dans l\'environnement)', () => {
    const out = patchGradle(GRADLE, ENV);
    for (const secret of ['p1', 'p2', '/tmp/k.jks']) expect(out).not.toContain(secret);
  });
  it('refuse sans toutes les variables, avec la liste de celles qui manquent', () => {
    expect(missingEnv({})).toHaveLength(5);
    expect(() => patchGradle(GRADLE, { ...ENV, KALAM_KEY_ALIAS: ' ' })).toThrow(/KALAM_KEY_ALIAS/);
  });
  it('refuse un numéro de version invalide (Google Play exige un entier croissant)', () => {
    for (const bad of ['0', '-3', '1.5', 'abc', '2200000000']) expect(() => patchGradle(GRADLE, { ...ENV, KALAM_VERSION_CODE: bad })).toThrow(/invalide/);
  });
  it('échoue bruyamment si le modèle de build.gradle change (plutôt que publier signé en débogage)', () => {
    expect(() => patchGradle(GRADLE.replace('signingConfig signingConfigs.debug\n            def', 'def'), ENV)).toThrow(/introuvable/);
    expect(() => patchGradle('rien', ENV)).toThrow(/introuvable/);
  });
  it('bornes du numéro de version: 1 et 2100000000 acceptés, 0 et 2100000001 refusés', () => {
    expect(patchGradle(GRADLE, { ...ENV, KALAM_VERSION_CODE: '1' })).toContain('versionCode 1\n');
    expect(patchGradle(GRADLE, { ...ENV, KALAM_VERSION_CODE: '2100000000' })).toContain('versionCode 2100000000');
    expect(() => patchGradle(GRADLE, { ...ENV, KALAM_VERSION_CODE: '0' })).toThrow(/invalide/);
    expect(() => patchGradle(GRADLE, { ...ENV, KALAM_VERSION_CODE: '2100000001' })).toThrow(/invalide/);
  });
  it('remplace un ancien numéro à plusieurs chiffres en entier (pas de chiffres qui traînent)', () => {
    const out = patchGradle(GRADLE.replace('versionCode 1', 'versionCode 4567'), ENV);
    expect(out).toContain('versionCode 12');
    expect(out).not.toMatch(/versionCode 12\d/);
  });
  it('chaque élément manquant du modèle donne sa propre erreur', () => {
    expect(() => patchGradle(GRADLE.replace('versionCode 1', 'versionName 1'), ENV)).toThrow(/versionCode introuvable/);
    expect(() => patchGradle(GRADLE.replace('signingConfigs {', 'signingConfigz {'), ENV)).toThrow(/signingConfigs introuvable/);
  });
  it('le message d\'erreur liste les variables manquantes séparées par des virgules', () => {
    expect(() => patchGradle(GRADLE, {})).toThrow('Variables manquantes: KALAM_KEYSTORE_FILE, KALAM_KEYSTORE_PASSWORD, KALAM_KEY_ALIAS, KALAM_KEY_PASSWORD, KALAM_VERSION_CODE');
  });
  it('un seul bloc release de signature est ajouté, à la fin du bloc signingConfigs', () => {
    const out = patchGradle(GRADLE, ENV);
    expect((out.match(/keyAlias System\.getenv/g) ?? []).length).toBe(1);
    expect(out).toMatch(/keyPassword 'android'\s*\}\s*release \{/); // le bloc debug est intact, release vient juste après
  });
});
