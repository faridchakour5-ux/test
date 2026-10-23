// Contenu et règles du mode enfant (4-8 ans). Tout est local: aucune donnée n'est envoyée à un serveur.
export interface KidsItem {
  id: string;
  emoji: string;
  en: string;
  fr: string;
  ar: string;
}

export interface KidsTopic {
  id: string;
  emoji: string;
  title: { fr: string; en: string; ar: string };
  items: KidsItem[];
}

const I = (id: string, emoji: string, en: string, fr: string, ar: string): KidsItem => ({ id, emoji, en, fr, ar });

export const KIDS_TOPICS: KidsTopic[] = [
  { id: 'animals', emoji: '🐾', title: { fr: 'Animaux', en: 'Animals', ar: 'حيوانات' }, items: [
    I('cat', '🐱', 'cat', 'chat', 'قطة'), I('dog', '🐶', 'dog', 'chien', 'كلب'), I('fish', '🐟', 'fish', 'poisson', 'سمكة'),
    I('bird', '🐦', 'bird', 'oiseau', 'طائر'), I('horse', '🐴', 'horse', 'cheval', 'حصان'), I('rabbit', '🐰', 'rabbit', 'lapin', 'أرنب'),
  ] },
  { id: 'fruits', emoji: '🍎', title: { fr: 'Fruits', en: 'Fruits', ar: 'فواكه' }, items: [
    I('apple', '🍎', 'apple', 'pomme', 'تفاحة'), I('banana', '🍌', 'banana', 'banane', 'موزة'), I('grapes', '🍇', 'grapes', 'raisin', 'عنب'),
    I('orange', '🍊', 'orange', 'orange', 'برتقالة'), I('strawberry', '🍓', 'strawberry', 'fraise', 'فراولة'), I('watermelon', '🍉', 'watermelon', 'pastèque', 'بطيخ'),
  ] },
  { id: 'colors', emoji: '🎨', title: { fr: 'Couleurs', en: 'Colors', ar: 'ألوان' }, items: [
    I('red', '🔴', 'red', 'rouge', 'أحمر'), I('blue', '🔵', 'blue', 'bleu', 'أزرق'), I('green', '🟢', 'green', 'vert', 'أخضر'),
    I('yellow', '🟡', 'yellow', 'jaune', 'أصفر'), I('purple', '🟣', 'purple', 'violet', 'بنفسجي'), I('orange-c', '🟠', 'orange', 'orange', 'برتقالي'),
  ] },
  { id: 'numbers', emoji: '🔢', title: { fr: 'Chiffres', en: 'Numbers', ar: 'أرقام' }, items: [
    I('one', '⭐', 'one', 'un', 'واحد'), I('two', '⭐⭐', 'two', 'deux', 'اثنان'), I('three', '⭐⭐⭐', 'three', 'trois', 'ثلاثة'),
    I('four', '⭐⭐⭐⭐', 'four', 'quatre', 'أربعة'), I('five', '⭐⭐⭐⭐⭐', 'five', 'cinq', 'خمسة'),
  ] },
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
export interface StorySentence { en: string; fr: string; ar: string }
export interface Story { id: string; emoji: string; title: { fr: string; en: string; ar: string }; sentences: StorySentence[] }

const S = (en: string, fr: string, ar: string): StorySentence => ({ en, fr, ar });

export const STORIES: Story[] = [
  { id: 'little-cat', emoji: '🐱', title: { fr: 'Le petit chat', en: 'The little cat', ar: 'القطة الصغيرة' }, sentences: [
    S('I see a little cat.', 'Je vois un petit chat.', 'أرى قطة صغيرة.'),
    S('The cat is orange.', 'Le chat est orange.', 'القطة برتقالية.'),
    S('The cat likes fish.', 'Le chat aime le poisson.', 'القطة تحب السمك.'),
    S('The cat is happy.', 'Le chat est content.', 'القطة سعيدة.'),
    S('Good night, little cat.', 'Bonne nuit, petit chat.', 'تصبحين على خير أيتها القطة.'),
  ] },
  { id: 'red-apple', emoji: '🍎', title: { fr: 'La pomme rouge', en: 'The red apple', ar: 'التفاحة الحمراء' }, sentences: [
    S('I have a red apple.', 'J\'ai une pomme rouge.', 'عندي تفاحة حمراء.'),
    S('The apple is big.', 'La pomme est grosse.', 'التفاحة كبيرة.'),
    S('I give you one half.', 'Je te donne une moitié.', 'أعطيك نصفها.'),
    S('Thank you, friend!', 'Merci, mon ami !', 'شكرًا يا صديقي!'),
    S('We eat the apple.', 'Nous mangeons la pomme.', 'نأكل التفاحة.'),
  ] },
  { id: 'sunny-day', emoji: '☀️', title: { fr: 'Une belle journée', en: 'A sunny day', ar: 'يوم مشمس' }, sentences: [
    S('Today is a sunny day.', 'Aujourd\'hui, il y a du soleil.', 'اليوم مشمس.'),
    S('I go to the park.', 'Je vais au parc.', 'أذهب إلى الحديقة.'),
    S('I see a bird.', 'Je vois un oiseau.', 'أرى طائرًا.'),
    S('The bird says hello.', 'L\'oiseau dit bonjour.', 'يقول الطائر مرحبًا.'),
    S('I say hello too!', 'Moi aussi je dis bonjour !', 'وأنا أيضًا أقول مرحبًا!'),
  ] },
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
