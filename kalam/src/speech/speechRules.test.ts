import { createSentenceSplitter } from './sentences';
import { cleanForSpeech, estimateSpeechMs, splitForSpeech } from './speechText';

describe('splitForSpeech: valeurs exactes', () => {
  it('tient en un seul bloc jusqu\'à la limite incluse', () => {
    expect(splitForSpeech('Hello there.', 12)).toEqual(['Hello there.']);
    expect(splitForSpeech('Hello there.', 11)).toEqual(['Hello there', '.']); // une seule phrase trop longue: coupée net à la limite
  });
  it('regroupe des phrases entières jusqu\'à la limite incluse', () => {
    expect(splitForSpeech('Aaaa. Bbbb. Cccc. Dddd.', 11)).toEqual(['Aaaa. Bbbb.', 'Cccc. Dddd.']);
    expect(splitForSpeech('Aaaa. Bbbb. Cccc. Dddd.', 10)).toEqual(['Aaaa.', 'Bbbb.', 'Cccc.', 'Dddd.']);
  });
  it('une phrase plus longue que la limite est coupée, après avoir rendu le bloc en cours', () => {
    expect(splitForSpeech('Hi you. ' + 'x'.repeat(12), 10)).toEqual(['Hi you.', 'xxxxxxxxxx', 'xx']);
  });
  it('la ponctuation répétée reste collée à sa phrase', () => {
    expect(splitForSpeech('Wait... what is this?! Fine!!', 16)).toEqual(['Wait...', 'what is this?!', 'Fine!!']);
  });
  it('texte sans ponctuation: coupé à la limite', () => {
    expect(splitForSpeech('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
  });
  it('markdown retiré avant la découpe', () => {
    expect(splitForSpeech('**Hi** `code` # title', 100)).toEqual(['Hi code title']);
  });
});

describe('cleanForSpeech', () => {
  it('retire les symboles de markdown un à un et plusieurs d\'affilée', () => {
    expect(cleanForSpeech('*a* _b_ `c` #d >e ~f')).toBe('a b c d e f');
    expect(cleanForSpeech('**a** ## b')).toBe('a b');
  });
  it('retire les émojis, replie les espaces multiples, enlève les bords', () => {
    expect(cleanForSpeech('  Hi   😀  there 🎉 ')).toBe('Hi there');
    expect(cleanForSpeech('😀')).toBe('');
  });
  it('garde les lettres accentuées et non latines', () => {
    expect(cleanForSpeech('Déjà vu ñ 你好 مرحبا')).toBe('Déjà vu ñ 你好 مرحبا');
  });
});

describe('estimateSpeechMs', () => {
  it('600 ms par mot + 4 s de marge, à vitesse normale', () => {
    expect(estimateSpeechMs('one two three', 1)).toBe(5800);
    expect(estimateSpeechMs('', 1)).toBe(4000);
  });
  it('compte les mots sans les espaces multiples ni les bords', () => {
    expect(estimateSpeechMs('  a   b  ', 1)).toBe(5200);
  });
  it('plus lent → plus long; vitesse plancher 0,5; plus rapide → plus court', () => {
    expect(estimateSpeechMs('a b', 0.5)).toBe(6400);
    expect(estimateSpeechMs('a b', 0.1)).toBe(6400);
    expect(estimateSpeechMs('a b', 2)).toBe(4600);
  });
});

describe('createSentenceSplitter: règles exactes', () => {
  const all = (text: string) => { const s = createSentenceSplitter(); return [...s.push(text), ...s.flush()]; };

  it('ne coupe pas tant que la suite est inconnue (fin de tampon), puis coupe quand elle arrive', () => {
    const s = createSentenceSplitter();
    expect(s.push('This is a long sentence.')).toEqual([]);
    expect(s.push(' And more')).toEqual(['This is a long sentence.']);
    expect(s.flush()).toEqual(['And more']);
  });
  it('ponctuation collée au mot suivant (3.5, e.g.x): pas de coupure', () => {
    expect(all('Version 3.5 is out now for everyone. ')).toEqual(['Version 3.5 is out now for everyone.']);
  });
  it('les abréviations ne coupent pas, même quand la phrase avant elles serait assez longue', () => {
    expect(all('Hello there Dr. Smith comes today. Bye now. ')).toEqual(['Hello there Dr. Smith comes today.', 'Bye now.']);
    expect(all('See you at St. Paul tomorrow morning. ')).toEqual(['See you at St. Paul tomorrow morning.']);
  });
  it('« ! » et « ? » coupent aussi, et un mot qui n\'est pas une abréviation coupe', () => {
    expect(all('Is that really true? Yes it is great! Fine. ')).toEqual(['Is that really true?', 'Yes it is great!', 'Fine.']);
    expect(all('I went home. Then I slept well tonight. ')).toEqual(['I went home.', 'Then I slept well tonight.']);
  });
  it('chiffre, point, chiffre (avec espaces) ne coupe pas; chiffre, point, mot coupe', () => {
    expect(all('The price is 3. 5 dollars in total. ')).toEqual(['The price is 3. 5 dollars in total.']);
    expect(all('The price is 3.  5 dollars in total. ')).toEqual(['The price is 3.  5 dollars in total.']);
    expect(all('I have seen 3. Then 4 of us left. ')).toEqual(['I have seen 3.', 'Then 4 of us left.']);
    expect(all('I have seen 3. Then we left the room. ')).toEqual(['I have seen 3.', 'Then we left the room.']);
    expect(all('Un 5. Ensuite 5 sont partis ici. ')).toEqual(['Un 5. Ensuite 5 sont partis ici.']); // « Un 5. » est trop court pour former un bloc
  });
  it('ponctuation répétée: « ?! » et « ... » restent dans la phrase', () => {
    expect(all('Is that really true?! Yes it is. ')).toEqual(['Is that really true?!', 'Yes it is.']);
    expect(all('Well... that was a surprise. ')).toEqual(['Well... that was a surprise.']);
  });
  it('seuil de 12 caractères inclus; en dessous, la phrase est regroupée avec la suivante', () => {
    expect(all('Hello world. Next thing happens now. ')).toEqual(['Hello world.', 'Next thing happens now.']);
    expect(all('Hello worl. Next thing happens now. ')).toEqual(['Hello worl. Next thing happens now.']);
  });
  it('flush vide le tampon: un second flush ne rend rien, et un nouveau texte repart de zéro', () => {
    const s = createSentenceSplitter();
    s.push('abc ');
    expect(s.flush()).toEqual(['abc']);
    expect(s.flush()).toEqual([]);
    expect(s.push('X is done now. Y ')).toEqual(['X is done now.']);
  });
});
