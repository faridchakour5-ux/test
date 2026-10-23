import { SseEvent, createSseParser } from './sse';

const parse = (chunks: string[]) => {
  const events: SseEvent[] = [];
  const p = createSseParser((e) => events.push(e));
  chunks.forEach((c) => p.feed(c));
  return events;
};

const stream = 'data: {"delta":"Hello"}\n\ndata: {"delta":" world"}\n\ndata: {"done":true}\n\n';

describe('createSseParser', () => {
  it('lit les évènements d\'un flux complet', () => {
    expect(parse([stream])).toEqual([{ delta: 'Hello' }, { delta: ' world' }, { done: true }]);
  });
  it('donne le même résultat quel que soit le découpage (même au milieu d\'un évènement)', () => {
    const expected = parse([stream]);
    expect(parse(stream.split(''))).toEqual(expected);
    expect(parse([stream.slice(0, 10), stream.slice(10, 33), stream.slice(33)])).toEqual(expected);
  });
  it('accepte les fins de ligne Windows', () => {
    expect(parse(['data: {"delta":"a"}\r\n\r\n'])).toEqual([{ delta: 'a' }]);
  });
  it('ignore commentaires, évènements vides et JSON illisible sans casser le flux', () => {
    expect(parse([': ping\n\n', 'data: \n\n', 'data: {pas du json}\n\n', 'data: {"delta":"ok"}\n\n'])).toEqual([{ delta: 'ok' }]);
  });
  it('transmet les erreurs du serveur', () => {
    expect(parse(['data: {"error":"teacher unavailable"}\n\n'])).toEqual([{ error: 'teacher unavailable' }]);
  });
  it('un évènement incomplet reste en attente', () => {
    expect(parse(['data: {"delta":"a"}'])).toEqual([]);
  });
});
