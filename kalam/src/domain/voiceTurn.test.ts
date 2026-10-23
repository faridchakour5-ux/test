import { MAX_SILENCES, TurnEvent, TurnState, initialTurn, turnReducer } from './voiceTurn';

const run = (events: TurnEvent[], start: TurnState = initialTurn()) => events.reduce(turnReducer, start);

describe('voiceTurn', () => {
  it('chaque nouvelle écoute reçoit un numéro différent, même si les étapes sont regroupées', () => {
    const first = run([{ type: 'SET_HANDS_FREE', on: true }, { type: 'LISTEN' }]);
    const second = run([{ type: 'HEARD' }, { type: 'REPLY' }, { type: 'SPOKEN' }], first);
    expect(second.phase).toBe('listening');
    expect(second.listenId).toBe(first.listenId + 1);
  });
  it('cycle normal: écoute, envoi, réponse, fin', () => {
    const s = run([{ type: 'LISTEN' }, { type: 'HEARD' }, { type: 'REPLY' }, { type: 'SPOKEN' }]);
    expect(s.phase).toBe('idle');
  });
  it('mains libres: relance l\'écoute après la réponse', () => {
    const s = run([{ type: 'SET_HANDS_FREE', on: true }, { type: 'LISTEN' }, { type: 'HEARD' }, { type: 'REPLY' }, { type: 'SPOKEN' }]);
    expect(s.phase).toBe('listening');
  });
  it('on ne peut pas écouter pendant que le professeur parle (sinon le micro capte sa voix)', () => {
    const speaking = run([{ type: 'LISTEN' }, { type: 'HEARD' }, { type: 'REPLY' }]);
    expect(turnReducer(speaking, { type: 'LISTEN' }).phase).toBe('speaking');
  });
  it('pas de double envoi', () => {
    const s = run([{ type: 'SEND' }]);
    expect(turnReducer(s, { type: 'SEND' })).toBe(s);
  });
  it('arrête le mode mains libres après des silences répétés', () => {
    let s = run([{ type: 'SET_HANDS_FREE', on: true }]);
    for (let i = 0; i < MAX_SILENCES; i++) s = run([{ type: 'LISTEN' }, { type: 'HEARD_FAIL', problem: 'no-speech' }], s);
    expect(s.handsFree).toBe(false);
    expect(s.phase).toBe('idle');
  });
  it('un silence isolé ne coupe pas le mode mains libres', () => {
    const s = run([{ type: 'SET_HANDS_FREE', on: true }, { type: 'LISTEN' }, { type: 'HEARD_FAIL', problem: 'no-speech' }]);
    expect(s.handsFree).toBe(true);
    expect(s.silences).toBe(1);
  });
  it('une parole réussie remet le compteur de silences à zéro', () => {
    const s = run([{ type: 'LISTEN' }, { type: 'HEARD_FAIL', problem: 'no-speech' }, { type: 'LISTEN' }, { type: 'HEARD' }]);
    expect(s.silences).toBe(0);
  });
  it('une erreur micro grave coupe le mains libres et passe en erreur', () => {
    const s = run([{ type: 'SET_HANDS_FREE', on: true }, { type: 'LISTEN' }, { type: 'HEARD_FAIL', problem: 'permission-blocked' }]);
    expect(s).toMatchObject({ phase: 'error', handsFree: false, problem: 'permission-blocked' });
  });
  it('un échec réseau passe en erreur, puis on peut réécouter', () => {
    const s = run([{ type: 'SEND' }, { type: 'SEND_FAIL', problem: 'offline' }]);
    expect(s).toMatchObject({ phase: 'error', problem: 'offline' });
    expect(turnReducer(s, { type: 'LISTEN' }).phase).toBe('listening');
  });
  it('STOP interrompt tout', () => {
    const s = run([{ type: 'SET_HANDS_FREE', on: true }, { type: 'LISTEN' }, { type: 'HEARD' }, { type: 'REPLY' }, { type: 'STOP' }]);
    expect(s).toMatchObject({ phase: 'idle', handsFree: false });
  });
  it('SPOKEN est ignoré hors de la phase « speaking »', () => {
    const s = initialTurn();
    expect(turnReducer(s, { type: 'SPOKEN' })).toBe(s);
  });
});
