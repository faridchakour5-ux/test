import { UiLang } from '../i18n/strings';
import { KIDS_ITEMS_TR, KIDS_STORY_TR, KIDS_TOPIC_TR } from './translations';

// Contenu et règles du mode enfant (4-8 ans). Tout est local: aucune donnée n'est envoyée à un serveur.
export interface KidsItem {
  id: string;
  emoji: string;
  en: string;
  fr: string;
  ar: string;
  es: string;
  zh: string;
}

export interface KidsTopic {
  id: string;
  emoji: string;
  title: Record<UiLang, string>;
  items: KidsItem[];
}

const I = (id: string, emoji: string, en: string, fr: string, ar: string): KidsItem => {
  const tr = KIDS_ITEMS_TR[id];
  if (!tr) throw new Error(`traduction manquante: ${id}`);
  return { id, emoji, en, fr, ar, es: tr.es, zh: tr.zh };
};

const TOPIC = (id: string, emoji: string, fr: string, en: string, ar: string, items: KidsItem[]): KidsTopic => {
  const tr = KIDS_TOPIC_TR[id];
  if (!tr) throw new Error(`titre manquant: ${id}`);
  return { id, emoji, title: { fr, en, ar, es: tr.es, zh: tr.zh }, items };
};

export const KIDS_TOPICS: KidsTopic[] = [
  TOPIC('animals', '🐾', 'Animaux', 'Animals', 'حيوانات', [
    I('cat', '🐱', 'cat', 'chat', 'قطة'), I('dog', '🐶', 'dog', 'chien', 'كلب'), I('fish', '🐟', 'fish', 'poisson', 'سمكة'),
    I('bird', '🐦', 'bird', 'oiseau', 'طائر'), I('horse', '🐴', 'horse', 'cheval', 'حصان'), I('rabbit', '🐰', 'rabbit', 'lapin', 'أرنب'),
  ]),
  TOPIC('fruits', '🍎', 'Fruits', 'Fruits', 'فواكه', [
    I('apple', '🍎', 'apple', 'pomme', 'تفاحة'), I('banana', '🍌', 'banana', 'banane', 'موزة'), I('grapes', '🍇', 'grapes', 'raisin', 'عنب'),
    I('orange', '🍊', 'orange', 'orange', 'برتقالة'), I('strawberry', '🍓', 'strawberry', 'fraise', 'فراولة'), I('watermelon', '🍉', 'watermelon', 'pastèque', 'بطيخ'),
  ]),
  TOPIC('colors', '🎨', 'Couleurs', 'Colors', 'ألوان', [
    I('red', '🔴', 'red', 'rouge', 'أحمر'), I('blue', '🔵', 'blue', 'bleu', 'أزرق'), I('green', '🟢', 'green', 'vert', 'أخضر'),
    I('yellow', '🟡', 'yellow', 'jaune', 'أصفر'), I('purple', '🟣', 'purple', 'violet', 'بنفسجي'), I('orange-c', '🟠', 'orange', 'orange', 'برتقالي'),
  ]),
  TOPIC('numbers', '🔢', 'Chiffres', 'Numbers', 'أرقام', [
    I('one', '⭐', 'one', 'un', 'واحد'), I('two', '⭐⭐', 'two', 'deux', 'اثنان'), I('three', '⭐⭐⭐', 'three', 'trois', 'ثلاثة'),
    I('four', '⭐⭐⭐⭐', 'four', 'quatre', 'أربعة'), I('five', '⭐⭐⭐⭐⭐', 'five', 'cinq', 'خمسة'),
  ]),
];

export const getTopic = (id: string) => KIDS_TOPICS.find((t) => t.id === id);

export interface Round {
  target: KidsItem;
  options: KidsItem[]; // 3 choix, dont la bonne réponse, dans un ordre mélangé
}

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildRounds(topicId: string, count = 5, rng: Rng = Math.random): Round[] {
  const topic = getTopic(topicId);
  if (!topic) return [];
  const targets = shuffle(topic.items, rng).slice(0, Math.min(count, topic.items.length));
  return targets.map((target) => {
    const distractors = shuffle(topic.items.filter((i) => i.id !== target.id), rng).slice(0, 2);
    return { target, options: shuffle([target, ...distractors], rng) };
  });
}

// ---------- Histoires ----------
export interface StorySentence { en: string; fr: string; ar: string; es: string; zh: string }
export interface Story { id: string; emoji: string; title: Record<UiLang, string>; sentences: StorySentence[] }


const ST = (id: string, emoji: string, fr: string, en: string, ar: string, base: [string, string, string][]): Story => {
  const tr = KIDS_STORY_TR[id];
  if (!tr) throw new Error(`histoire sans traduction: ${id}`);
  if (tr.sentences.length !== base.length) throw new Error(`phrases incohérentes: ${id}`);
  return {
    id, emoji, title: { fr, en, ar, es: tr.title.es, zh: tr.title.zh },
    sentences: base.map(([e, f, a], i) => ({ en: e, fr: f, ar: a, es: tr.sentences[i].es, zh: tr.sentences[i].zh })),
  };
};

export const STORIES: Story[] = [
  ST('little-cat', '🐱', 'Le petit chat', 'The little cat', 'القطة الصغيرة', [
    ['I see a little cat.', 'Je vois un petit chat.', 'أرى قطة صغيرة.'],
    ['The cat is orange.', 'Le chat est orange.', 'القطة برتقالية.'],
    ['The cat likes fish.', 'Le chat aime le poisson.', 'القطة تحب السمك.'],
    ['The cat is happy.', 'Le chat est content.', 'القطة سعيدة.'],
    ['Good night, little cat.', 'Bonne nuit, petit chat.', 'تصبحين على خير أيتها القطة.'],
  ]),
  ST('red-apple', '🍎', 'La pomme rouge', 'The red apple', 'التفاحة الحمراء', [
    ['I have a red apple.', 'J\'ai une pomme rouge.', 'عندي تفاحة حمراء.'],
    ['The apple is big.', 'La pomme est grosse.', 'التفاحة كبيرة.'],
    ['I give you one half.', 'Je te donne une moitié.', 'أعطيك نصفها.'],
    ['Thank you, friend!', 'Merci, mon ami !', 'شكرًا يا صديقي!'],
    ['We eat the apple.', 'Nous mangeons la pomme.', 'نأكل التفاحة.'],
  ]),
  ST('sunny-day', '☀️', 'Une belle journée', 'A sunny day', 'يوم مشمس', [
    ['Today is a sunny day.', 'Aujourd\'hui, il y a du soleil.', 'اليوم مشمس.'],
    ['I go to the park.', 'Je vais au parc.', 'أذهب إلى الحديقة.'],
    ['I see a bird.', 'Je vois un oiseau.', 'أرى طائرًا.'],
    ['The bird says hello.', 'L\'oiseau dit bonjour.', 'يقول الطائر مرحبًا.'],
    ['I say hello too!', 'Moi aussi je dis bonjour !', 'وأنا أيضًا أقول مرحبًا!'],
  ]),
];

export const getStory = (id: string) => STORIES.find((s) => s.id === id);

// ---------- Récompenses ----------
export interface Sticker { id: string; emoji: string; stars: number }

export const STICKERS: Sticker[] = [
  { id: 'rocket', emoji: '🚀', stars: 3 }, { id: 'rainbow', emoji: '🌈', stars: 8 }, { id: 'unicorn', emoji: '🦄', stars: 15 },
  { id: 'robot', emoji: '🤖', stars: 25 }, { id: 'crown', emoji: '👑', stars: 40 }, { id: 'dino', emoji: '🦖', stars: 60 },
  { id: 'castle', emoji: '🏰', stars: 85 }, { id: 'planet', emoji: '🪐', stars: 120 },
];

export const unlockedStickers = (stars: number) => STICKERS.filter((s) => stars >= s.stars);

export function newlyUnlocked(before: number, after: number): Sticker[] {
  return STICKERS.filter((s) => before < s.stars && after >= s.stars);
}

// Une bonne réponse = 1 étoile. Jamais de retrait d'étoiles: pas de punition.
export const STARS_PER_CORRECT = 1;
