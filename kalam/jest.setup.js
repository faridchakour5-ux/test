/* global jest */
// Zones sûres (encoche, barre de navigation): module natif simulé pour les tests (marges nulles par défaut).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
