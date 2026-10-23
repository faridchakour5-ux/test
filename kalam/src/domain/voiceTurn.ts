// Machine à états d'une conversation vocale: qui parle, quand. Pure, donc entièrement testable.
// idle -> listening -> sending -> speaking -> (idle | listening en mode mains libres)
export type TurnPhase = 'idle' | 'listening' | 'sending' | 'speaking' | 'error';

export type TurnProblem =
  | 'no-speech' | 'permission' | 'permission-blocked' | 'unavailable' | 'network-mic' | 'language' | 'mic-error'
  | 'offline' | 'timeout' | 'server' | 'rate';

export interface TurnState {
  phase: TurnPhase;
  handsFree: boolean; // on relance l'écoute automatiquement après la réponse du professeur
  silences: number; // silences consécutifs (on arrête le mode mains libres après 2)
  problem: TurnProblem | null;
  // Numéro de la prise de parole en cours: change à CHAQUE nouvelle écoute, même si les étapes
  // intermédiaires ont été regroupées par React (la phase seule ne suffit pas à détecter une nouvelle écoute).
  listenId: number;
}

export type TurnEvent =
  | { type: 'LISTEN' } // l'utilisateur appuie sur le micro
  | { type: 'HEARD' } // du texte a été reconnu (il part vers le professeur)
  | { type: 'HEARD_FAIL'; problem: TurnProblem }
  | { type: 'SEND' } // un message texte part (saisie clavier)
  | { type: 'REPLY' } // réponse reçue: le professeur parle
  | { type: 'SEND_FAIL'; problem: TurnProblem }
  | { type: 'SPOKEN' } // fin de la lecture vocale
  | { type: 'STOP' } // l'utilisateur interrompt
  | { type: 'SET_HANDS_FREE'; on: boolean };

export const MAX_SILENCES = 2;

export const initialTurn = (): TurnState => ({ phase: 'idle', handsFree: false, silences: 0, problem: null, listenId: 0 });

export function turnReducer(s: TurnState, e: TurnEvent): TurnState {
  switch (e.type) {
    case 'LISTEN':
      // On ne peut pas écouter pendant que le professeur parle ou qu'une réponse est en route.
      if (s.phase === 'sending' || s.phase === 'speaking') return s;
      return { ...s, phase: 'listening', problem: null, listenId: s.listenId + 1 };
    case 'HEARD':
      return { ...s, phase: 'sending', silences: 0, problem: null };
    case 'SEND':
      if (s.phase === 'sending') return s; // pas de double envoi
      return { ...s, phase: 'sending', problem: null };
    case 'HEARD_FAIL': {
      const silences = e.problem === 'no-speech' ? s.silences + 1 : s.silences;
      // Trop de silences: on rend la main sans insister (pas d'écoute infinie).
      const stopHandsFree = silences >= MAX_SILENCES || e.problem !== 'no-speech';
      return { ...s, phase: e.problem === 'no-speech' ? 'idle' : 'error', silences, handsFree: stopHandsFree ? false : s.handsFree, problem: e.problem };
    }
    case 'REPLY':
      return { ...s, phase: 'speaking', problem: null };
    case 'SEND_FAIL':
      return { ...s, phase: 'error', handsFree: false, problem: e.problem };
    case 'SPOKEN':
      if (s.phase !== 'speaking') return s;
      return s.handsFree ? { ...s, phase: 'listening', listenId: s.listenId + 1 } : { ...s, phase: 'idle' };
    case 'STOP':
      return { ...s, phase: 'idle', handsFree: false, silences: 0 };
    case 'SET_HANDS_FREE':
      return { ...s, handsFree: e.on, silences: 0 };
  }
}
