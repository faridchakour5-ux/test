import { PROBLEM_TEXT, RETRYABLE_SEND, problemFromListen, problemFromTeacher } from './problems';
import { fr } from '../i18n/locales/fr';

describe('problemFromListen: chaque cause du micro a son problème', () => {
  it.each([
    ['no-speech', 'no-speech'], ['permission', 'permission'], ['permission-blocked', 'permission-blocked'],
    ['unavailable', 'unavailable'], ['network', 'network-mic'], ['language', 'language'], ['busy', 'mic-error'], ['error', 'mic-error'],
  ] as const)('%s → %s', (reason, problem) => {
    expect(problemFromListen(reason)).toBe(problem);
  });
});

describe('problemFromTeacher', () => {
  it.each([
    ['offline', 'offline'], ['timeout', 'timeout'], ['rate', 'rate'], ['server', 'server'], ['config', 'config'],
    ['invalid', 'server'], ['cancelled', 'server'],
  ] as const)('%s → %s', (kind, problem) => {
    expect(problemFromTeacher(kind)).toBe(problem);
  });
});

describe('messages et nouvel essai', () => {
  it('chaque problème a un message existant en français', () => {
    for (const key of Object.values(PROBLEM_TEXT)) expect((fr as Record<string, string>)[key]).toBeTruthy();
  });
  it('correspondance exacte problème → message', () => {
    expect(PROBLEM_TEXT).toEqual({
      'no-speech': 'noSpeech', permission: 'micPermission', 'permission-blocked': 'pBlocked', unavailable: 'micUnavailable',
      'network-mic': 'pMicNetwork', language: 'pLanguage', 'mic-error': 'pMic', offline: 'pOffline', timeout: 'pTimeout',
      server: 'pServer', rate: 'pRate', config: 'pConfig',
    });
  });
  it('« Réessayer l\'envoi » seulement pour les pannes passagères du réseau ou du serveur', () => {
    expect([...RETRYABLE_SEND].sort()).toEqual(['offline', 'rate', 'server', 'timeout']);
    expect(RETRYABLE_SEND).not.toContain('config');
    expect(RETRYABLE_SEND).not.toContain('permission');
  });
});
