import { createSentenceSplitter } from './sentences';

const run = (chunks: string[]) => {
  const s = createSentenceSplitter();
  const out: string[] = [];
  for (const c of chunks) out.push(...s.push(c));
  out.push(...s.flush());
  return out;
};

describe('createSentenceSplitter', () => {
  it('émet une phrase dès qu\'elle est complète', () => {
    const s = createSentenceSplitter();
    expect(s.push('Welcome to our restaurant')).toEqual([]); // pas encore terminée
    expect(s.push('! ')).toEqual(['Welcome to our restaurant!']); // l'espace après « ! » confirme la fin
    expect(s.push('What would you like')).toEqual([]);
    expect(s.flush()).toEqual(['What would you like']);
  });

  it('reconstitue les mêmes phrases quel que soit le découpage réseau', () => {
    const text = 'Welcome to our restaurant! What would you like to eat today? We have fresh fish.';
    const whole = run([text]);
    const letters = run(text.split(''));
    const odd = run([text.slice(0, 7), text.slice(7, 40), text.slice(40, 41), text.slice(41)]);
    expect(whole).toEqual(['Welcome to our restaurant!', 'What would you like to eat today?', 'We have fresh fish.']);
    expect(letters).toEqual(whole);
    expect(odd).toEqual(whole);
  });

  it('ne perd aucun caractère', () => {
    const text = 'Great job! (We say: I went to the market.) Now, tell me more about it, please?';
    expect(run(text.split('')).join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' '));
  });

  it('ne coupe pas sur les abréviations ni les nombres', () => {
    expect(run(['I met Dr. Smith at 3.5 degrees today. It was fun to talk with him.'])).toEqual([
      'I met Dr. Smith at 3.5 degrees today.', 'It was fun to talk with him.',
    ]);
  });

  it('regroupe les phrases très courtes pour une lecture fluide', () => {
    expect(run(['Hi! How are you doing today? I am fine.'])).toEqual(['Hi! How are you doing today?', 'I am fine.']);
  });

  it('gère la ponctuation répétée et le texte sans ponctuation finale', () => {
    expect(run(['Really?! That is amazing news. Tell me'])).toEqual(['Really?! That is amazing news.', 'Tell me']);
  });

  it('flush renvoie [] quand il ne reste rien', () => {
    const s = createSentenceSplitter();
    expect(s.flush()).toEqual([]);
    s.push('One complete sentence here. ');
    expect(s.flush()).toEqual([]);
  });
});
