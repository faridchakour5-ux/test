import { createSseParser, SseEvent } from '../api/sse';
import { contrastRatio, luminance, meetsAA } from '../theme/contrast';
import { MAX_SILENCES, TurnState, initialTurn, turnReducer } from './voiceTurn';
import { KIDS_TOPICS, STORIES, buildRounds, getStory, getTopic } from './kids';

const st = (over: Partial<TurnState> = {}): TurnState => ({ ...initialTurn(), ...over });

describe('flux SSE: analyse exacte', () => {
  const run = (...chunks: string[]) => { const out: SseEvent[] = []; const p = createSseParser((e) => out.push(e)); chunks.forEach((c) => p.feed(c)); return out; };
  it('« data: » avec ou sans espace, un seul espace retiré', () => {
    expect(run('data: {"delta":"a"}\n\ndata:{"delta":"b"}\n\n')).toEqual([{ delta: 'a' }, { delta: 'b' }]);
    expect(run('data:  {"delta":"c"}\n\n')).toEqual([{ delta: 'c' }]); // deux espaces: JSON valide quand même
  });
  it('plusieurs lignes data d\'un même évènement sont jointes par un retour à la ligne', () => {
    expect(run('data: {"delta":\ndata: "x"}\n\n')).toEqual([{ delta: 'x' }]);
  });
  it('commentaires, autres champs et évènements vides ignorés', () => {
    expect(run(': ping\n\nevent: x\nid: 1\n\ndata:\n\ndata: {"done":true}\n\n')).toEqual([{ done: true }]);
    expect(run(': ping\ndata: {"delta":"k"}\n\n')).toEqual([{ delta: 'k' }]);
  });
  it('JSON illisible ou qui n\'est pas un objet: ignoré, le flux continue', () => {
    expect(run('data: {nope\n\ndata: 5\n\ndata: null\n\ndata: "texte"\n\ndata: true\n\ndata: {"delta":"ok"}\n\n')).toEqual([{ delta: 'ok' }]);
  });
  it('un morceau réseau coupé n\'importe où, retours chariot Windows compris', () => {
    const whole = 'data: {"delta":"é"}\r\n\r\ndata: {"done":true}\r\n\r\n';
    for (let i = 1; i < whole.length; i++) expect(run(whole.slice(0, i), whole.slice(i))).toEqual([{ delta: 'é' }, { done: true }]);
  });
  it('évènement incomplet: rien tant que la ligne vide n\'est pas arrivée', () => {
    expect(run('data: {"delta":"a"}\n')).toEqual([]);
    expect(run('data: {"delta":"a"}\n', '\n')).toEqual([{ delta: 'a' }]);
  });
});

describe('contraste WCAG', () => {
  it('noir sur blanc = 21, identique = 1, ordre sans importance', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#336699', '#336699')).toBe(1);
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
    expect(luminance('#000000')).toBe(0);
  });
  it('valeurs de référence: #767676 sur blanc passe AA (4,54), #777777 non (4,48)', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(meetsAA('#767676', '#ffffff')).toBe(true);
    expect(meetsAA('#777777', '#ffffff')).toBe(false);
  });
  it('canaux pondérés (rouge 0,2126, vert 0,7152, bleu 0,0722)', () => {
    expect(luminance('#ff0000')).toBeCloseTo(0.2126, 4);
    expect(luminance('#00ff00')).toBeCloseTo(0.7152, 4);
    expect(luminance('#0000ff')).toBeCloseTo(0.0722, 4);
  });
  it('tons très sombres: partie linéaire de la courbe (v/255/12,92)', () => {
    expect(luminance('#050505')).toBeCloseTo((5 / 255 / 12.92), 6);
    expect(contrastRatio('#050505', '#ffffff')).toBeCloseTo(1.05 / (5 / 255 / 12.92 + 0.05), 4);
  });
  it('seuil exact 4,5 inclus', () => {
    // gris dont le ratio est 4,5 pile n'existe pas en hexadécimal: on vérifie les deux côtés les plus proches
    expect(meetsAA('#757575', '#ffffff')).toBe(true); // 4,60
    expect(meetsAA('#7a7a7a', '#ffffff')).toBe(false); // 4,29
  });
});

describe('tour de parole vocal: transitions exactes', () => {
  it('LISTEN: écoute, nouvelle prise de parole, problème effacé; ignoré pendant l\'envoi et la parole', () => {
    expect(turnReducer(st({ problem: 'server', listenId: 4 }), { type: 'LISTEN' })).toEqual(st({ phase: 'listening', problem: null, listenId: 5 }));
    for (const phase of ['sending', 'speaking'] as const) { const s = st({ phase, listenId: 2 }); expect(turnReducer(s, { type: 'LISTEN' })).toBe(s); }
    for (const phase of ['idle', 'listening', 'error'] as const) expect(turnReducer(st({ phase }), { type: 'LISTEN' }).phase).toBe('listening');
  });
  it('HEARD: envoi, silences remis à zéro, problème effacé', () => {
    expect(turnReducer(st({ phase: 'listening', silences: 1, problem: 'no-speech' }), { type: 'HEARD' })).toEqual(st({ phase: 'sending', silences: 0, problem: null }));
  });
  it('SEND (clavier): envoi sans toucher aux silences; pas de double envoi', () => {
    expect(turnReducer(st({ phase: 'idle', silences: 1, problem: 'server' }), { type: 'SEND' })).toEqual(st({ phase: 'sending', silences: 1, problem: null }));
    const s = st({ phase: 'sending', problem: null });
    expect(turnReducer(s, { type: 'SEND' })).toBe(s);
    expect(turnReducer(st({ phase: 'speaking' }), { type: 'SEND' }).phase).toBe('sending');
  });
  it('HEARD_FAIL silence: retour au repos, silences comptés, mains libres coupé au 2e silence', () => {
    const a = turnReducer(st({ phase: 'listening', handsFree: true }), { type: 'HEARD_FAIL', problem: 'no-speech' });
    expect(a).toEqual(st({ phase: 'idle', handsFree: true, silences: 1, problem: 'no-speech' }));
    const b = turnReducer(a, { type: 'HEARD_FAIL', problem: 'no-speech' });
    expect(MAX_SILENCES).toBe(2);
    expect(b).toEqual(st({ phase: 'idle', handsFree: false, silences: 2, problem: 'no-speech' }));
  });
  it('HEARD_FAIL autre problème: erreur, mains libres coupé, silences inchangés', () => {
    for (const problem of ['permission', 'mic-error', 'network-mic'] as const)
      expect(turnReducer(st({ phase: 'listening', handsFree: true, silences: 1 }), { type: 'HEARD_FAIL', problem })).toEqual(st({ phase: 'error', handsFree: false, silences: 1, problem }));
  });
  it('REPLY: le professeur parle, problème effacé; SEND_FAIL: erreur, mains libres coupé', () => {
    expect(turnReducer(st({ phase: 'sending', problem: 'server' }), { type: 'REPLY' })).toEqual(st({ phase: 'speaking', problem: null }));
    expect(turnReducer(st({ phase: 'sending', handsFree: true }), { type: 'SEND_FAIL', problem: 'offline' })).toEqual(st({ phase: 'error', handsFree: false, problem: 'offline' }));
  });
  it('SPOKEN: mains libres → on réécoute (nouvelle prise de parole); sinon repos; ignoré hors parole', () => {
    expect(turnReducer(st({ phase: 'speaking', handsFree: true, listenId: 7 }), { type: 'SPOKEN' })).toEqual(st({ phase: 'listening', handsFree: true, listenId: 8 }));
    expect(turnReducer(st({ phase: 'speaking', handsFree: false, listenId: 7 }), { type: 'SPOKEN' })).toEqual(st({ phase: 'idle', listenId: 7 }));
    for (const phase of ['idle', 'listening', 'sending', 'error'] as const) { const s = st({ phase, handsFree: true }); expect(turnReducer(s, { type: 'SPOKEN' })).toBe(s); }
  });
  it('STOP: repos, mains libres coupé, silences à zéro; SET_HANDS_FREE: bascule et remet les silences à zéro', () => {
    expect(turnReducer(st({ phase: 'speaking', handsFree: true, silences: 1, problem: 'server', listenId: 3 }), { type: 'STOP' })).toEqual(st({ phase: 'idle', handsFree: false, silences: 0, problem: 'server', listenId: 3 }));
    expect(turnReducer(st({ silences: 2 }), { type: 'SET_HANDS_FREE', on: true })).toEqual(st({ handsFree: true, silences: 0 }));
    expect(turnReducer(st({ handsFree: true, silences: 1 }), { type: 'SET_HANDS_FREE', on: false })).toEqual(st({ handsFree: false, silences: 0 }));
  });
  it('état initial', () => {
    expect(initialTurn()).toEqual({ phase: 'idle', handsFree: false, silences: 0, problem: null, listenId: 0 });
  });
});

describe('jeu des enfants: manches', () => {
  const topic = KIDS_TOPICS[0];
  it('sans mélange (le hasard tombe toujours en bout de liste): ordre du thème conservé', () => {
    const rounds = buildRounds(topic.id, 3, () => 0.999999);
    expect(rounds.map((r) => r.target.id)).toEqual(topic.items.slice(0, 3).map((i) => i.id));
  });
  it('mélange de Fisher-Yates: avec un hasard à 0, chaque élément est échangé avec le premier', () => {
    const items = topic.items.map((i) => i.id);
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) [a[i], a[0]] = [a[0], a[i]];
    expect(buildRounds(topic.id, items.length, () => 0).map((r) => r.target.id)).toEqual(a);
  });
  it('3 choix distincts dont la bonne réponse; au plus « count » manches, au plus le nombre d\'éléments', () => {
    const rounds = buildRounds(topic.id, 4);
    expect(rounds).toHaveLength(Math.min(4, topic.items.length));
    for (const r of rounds) {
      expect(r.options).toHaveLength(3);
      expect(new Set(r.options.map((o) => o.id)).size).toBe(3);
      expect(r.options.some((o) => o.id === r.target.id)).toBe(true);
    }
    expect(buildRounds(topic.id, 999)).toHaveLength(topic.items.length);
    expect(buildRounds('inconnu')).toEqual([]);
  });
  it('la bonne réponse n\'est pas toujours à la même place', () => {
    const places = new Set<number>();
    for (let k = 0; k < 40; k++) for (const r of buildRounds(topic.id, 5, (() => { let x = k + 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; })())) places.add(r.options.findIndex((o) => o.id === r.target.id));
    expect(places.size).toBe(3);
  });
  it('recherche par identifiant: trouve le bon, rien si inconnu', () => {
    expect(getTopic(topic.id)).toBe(topic);
    expect(getTopic('zzz')).toBeUndefined();
    expect(getStory(STORIES[1].id)).toBe(STORIES[1]);
    expect(getStory('zzz')).toBeUndefined();
  });
});
