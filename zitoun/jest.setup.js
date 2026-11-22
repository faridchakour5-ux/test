/* global jest */
// Zones sûres (encoche, barre de navigation): module natif simulé pour les tests (marges nulles par défaut).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Stockage local: faux module natif officiel.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
