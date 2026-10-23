import { evaluatePronunciation, normalize, similarity } from './pronunciation';

// Valeurs exactes de l'évaluation de prononciation (seuils, partition des mots, score).
describe('normalize', () => {
  it('une ponctuation collée entre deux mots les sépare au lieu de les fusionner', () => {
    expect(normalize('hello,world')).toEqual(['hello', 'world']);
    expect(normalize('un-deux')).toEqual(['un', 'deux']);
  });
  it('les apostrophes disparaissent sans couper le mot', () => {
    expect(normalize("don't l’ami")).toEqual(['dont', 'lami']);
  });
});

describe('similarity', () => {
  it('deux textes vides sont identiques (pas de NaN)', () => {
    expect(similarity('', '')).toBe(1);
  });
  it('compare à la longueur du plus long, dans les deux sens', () => {
    expect(similarity('', 'abc')).toBe(0);
    expect(similarity('abc', '')).toBe(0);
    expect(similarity('a', 'ab')).toBe(0.5);
    expect(similarity('ab', 'a')).toBe(0.5);
    expect(similarity('cat', 'cut')).toBeCloseTo(2 / 3, 10);
    expect(similarity('ab', 'ba')).toBe(0);
  });
});

describe('evaluatePronunciation', () => {
  it('une phrase attendue sans aucun mot donne un résultat vide, score 0', () => {
    expect(evaluatePronunciation('', 'hello')).toEqual({ words: [], score: 0 });
    expect(evaluatePronunciation('?!', 'hello')).toEqual({ words: [], score: 0 });
  });
  it('rien entendu: tous les mots manquent, score 0', () => {
    expect(evaluatePronunciation('hello world', '')).toEqual({
      words: [{ word: 'hello', status: 'missing' }, { word: 'world', status: 'missing' }], score: 0,
    });
  });
  it('seuil « correct » à 85 % inclus', () => {
    const word = 'abcdefghijklmnopqrst'; // 20 lettres, 3 fautes = 85 %
    const heard = 'abcdefghijklmnopqxyz';
    expect(similarity(word, heard)).toBe(0.85);
    expect(evaluatePronunciation(word, heard).words[0].status).toBe('correct');
  });
  it('seuil « proche » à 60 % inclus, et compte pour un demi-point', () => {
    expect(similarity('aaaaa', 'aaabb')).toBe(0.6);
    const r = evaluatePronunciation('aaaaa', 'aaabb');
    expect(r.words[0].status).toBe('close');
    expect(r.score).toBe(50);
  });
  it('en dessous de 60 %: faux, zéro point', () => {
    const r = evaluatePronunciation('aaaaa', 'aabbb');
    expect(r.words[0]).toEqual({ word: 'aaaaa', status: 'wrong', heard: 'aabbb' });
    expect(r.score).toBe(0);
  });
  it('un mot juste + un mot proche = 75', () => {
    expect(evaluatePronunciation('go aaaaa', 'go aaabb').score).toBe(75);
  });
  it('mots oubliés au début: seul le dernier mot est reconnu', () => {
    const r = evaluatePronunciation('one two three', 'three');
    expect(r.words.map((w) => w.status)).toEqual(['missing', 'missing', 'correct']);
    expect(r.score).toBe(33);
  });
  it('mots ajoutés au début par la reconnaissance: ignorés, le mot attendu reste correct', () => {
    const r = evaluatePronunciation('three', 'one two three');
    expect(r.words).toEqual([{ word: 'three', status: 'correct', heard: 'three' }]);
    expect(r.score).toBe(100);
  });
});
