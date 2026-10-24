/* global jest */
// Zones sûres (encoche, barre de navigation): module natif simulé pour les tests (marges nulles par défaut).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Langue du téléphone: les tests partent du français (comme avant); le vrai comportement est testé dans deviceLanguage.test.ts.
jest.mock('./src/i18n/deviceLanguage', () => ({ ...jest.requireActual('./src/i18n/deviceLanguage'), deviceUiLang: jest.fn(() => 'fr') }));

// Stockage local: faux module natif officiel (les tests qui ont leur propre simulation la gardent).
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
