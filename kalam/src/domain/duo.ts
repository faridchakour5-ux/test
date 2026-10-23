import { UiLang } from '../i18n/strings';
import { FreeTopic } from './freeTopics';
import { Lesson } from './lessons';

// Mode « conversation à deux »: deux personnes pratiquent ensemble, le professeur IA anime et donne la parole à chacun.

export const DUO_LESSON_ID = 'duo';
export const MAX_NAME_LENGTH = 16;

// Les prénoms finissent dans la consigne de l'IA: on n'accepte que lettres, chiffres, espace, tiret et apostrophe.
// Pas de crochets, de retours à la ligne ni de ponctuation: impossible d'y glisser une instruction ou de casser le format « [Nom] ».
export function sanitizeName(raw: string, fallback: string): string {
  const cleaned = raw
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} '’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return cleaned || fallback;
}

// Deux joueurs doivent se distinguer: si les prénoms sont identiques, on numérote le second.
export function uniqueNames(a: string, b: string, fallbackA = 'A', fallbackB = 'B'): [string, string] {
  const na = sanitizeName(a, fallbackA);
  let nb = sanitizeName(b, fallbackB);
  if (nb.toLowerCase() === na.toLowerCase()) nb = `${nb.slice(0, MAX_NAME_LENGTH - 2)} 2`;
  return [na, nb];
}

export const tagMessage = (name: string, text: string) => `[${name}] ${text}`;

// Sépare « [Nom] message » en { speaker, text }. Un message sans étiquette n'a pas de locuteur.
export function parseTagged(content: string): { speaker: string | null; text: string } {
  const m = content.match(/^\[([^\]\n]{1,40})\]\s*([\s\S]*)$/);
  return m ? { speaker: m[1], text: m[2] } : { speaker: null, text: content };
}

export function duoScenario(a: string, b: string, topic: FreeTopic | null): string {
  const subject = topic ? topic.scenario.replace(/^Free conversation about: /, '').replace(/\. Let the learner.*$/, '') : 'any everyday topic';
  // Court exprès: le serveur limite la consigne à 300 caractères (prénoms de 16 signes inclus).
  return (
    `Host a chat between learners ${a} and ${b} about ${subject}. ` +
    `Messages start with [name]. Invite each in turn, by name, with gentle feedback. Keep replies short.`
  );
}

export function duoLesson(a: string, b: string, topic: FreeTopic | null): Lesson {
  const title = `${a} & ${b}`;
  const all = { fr: title, en: title, ar: title, es: title, zh: title } as Record<UiLang, string>;
  return { id: DUO_LESSON_ID, level: 'A1', title: all, scenario: duoScenario(a, b, topic), vocab: [] };
}
