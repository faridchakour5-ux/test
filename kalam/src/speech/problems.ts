import { TeacherErrorKind } from '../api/teacher';
import { TurnProblem } from '../domain/voiceTurn';
import { StringKey } from '../i18n/strings';
import { ListenFailure } from './recognizer';

export function problemFromListen(reason: Exclude<ListenFailure, 'cancelled'>): TurnProblem {
  switch (reason) {
    case 'no-speech': return 'no-speech';
    case 'permission': return 'permission';
    case 'permission-blocked': return 'permission-blocked';
    case 'unavailable': return 'unavailable';
    case 'network': return 'network-mic';
    case 'language': return 'language';
    default: return 'mic-error';
  }
}

export function problemFromTeacher(kind: TeacherErrorKind): TurnProblem {
  return kind === 'invalid' || kind === 'cancelled' ? 'server' : kind; // 'config' est conservé: ce n'est pas une panne passagère
}

export const PROBLEM_TEXT: Record<TurnProblem, StringKey> = {
  'no-speech': 'noSpeech',
  permission: 'micPermission',
  'permission-blocked': 'pBlocked',
  unavailable: 'micUnavailable',
  'network-mic': 'pMicNetwork',
  language: 'pLanguage',
  'mic-error': 'pMic',
  offline: 'pOffline',
  timeout: 'pTimeout',
  server: 'pServer',
  rate: 'pRate',
  config: 'pConfig',
};

// Problèmes pour lesquels « Réessayer l'envoi » a du sens (le message est déjà écrit).
export const RETRYABLE_SEND: TurnProblem[] = ['offline', 'timeout', 'server', 'rate'];
