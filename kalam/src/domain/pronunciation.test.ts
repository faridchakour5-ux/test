import { evaluatePronunciation, normalize } from './pronunciation';

describe('pronunciation', () => {
  it('normalise la ponctuation et la casse', () => {
    expect(normalize("I'd like  Water, please!")).toEqual(['id', 'like', 'water', 'please']);
  });
  it('100 pour une phrase identique', () => {
    const r = evaluatePronunciation('Turn left', 'turn left');
    expect(r.score).toBe(100);
    expect(r.words.every((w) => w.status === 'correct')).toBe(true);
  });
  it('signale un mot manquant', () => {
    const r = evaluatePronunciation('I would like water', 'I would water');
    expect(r.words.find((w) => w.word === 'like')?.status).toBe('missing');
    expect(r.score).toBe(75);
  });
  it('accepte une petite faute, signale un mot proche et un mot faux', () => {
    const close = evaluatePronunciation('prescription', 'prescripsion');
    expect(close.words[0].status).toBe('correct');
    const r = evaluatePronunciation('headache', 'headak');
    expect(r.words[0].status).toBe('close');
    expect(evaluatePronunciation('fever', 'banana').words[0].status).toBe('wrong');
  });
  it('ignore les mots en trop', () => {
    expect(evaluatePronunciation('hello', 'oh hello there').score).toBe(100);
  });
  it('rien entendu -> tout manquant', () => {
    const r = evaluatePronunciation('good morning', '');
    expect(r.score).toBe(0);
    expect(r.words.map((w) => w.status)).toEqual(['missing', 'missing']);
  });
});
