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
  TOPIC('body', '🧍', 'Le corps', 'The body', 'الجسم', [
    I('eye', '👀', 'eye', 'œil', 'عين'), I('nose', '👃', 'nose', 'nez', 'أنف'), I('mouth', '👄', 'mouth', 'bouche', 'فم'),
    I('hand', '✋', 'hand', 'main', 'يد'), I('foot', '🦶', 'foot', 'pied', 'قدم'), I('ear', '👂', 'ear', 'oreille', 'أذن'),
  ]),
  TOPIC('food', '🍽️', 'Nourriture', 'Food', 'طعام', [
    I('bread', '🍞', 'bread', 'pain', 'خبز'), I('milk', '🥛', 'milk', 'lait', 'حليب'), I('rice', '🍚', 'rice', 'riz', 'أرز'),
    I('egg', '🥚', 'egg', 'œuf', 'بيضة'), I('cheese', '🧀', 'cheese', 'fromage', 'جبن'), I('pizza', '🍕', 'pizza', 'pizza', 'بيتزا'),
  ]),
  TOPIC('numbers', '🔢', 'Chiffres', 'Numbers', 'أرقام', [
    I('one', '⭐', 'one', 'un', 'واحد'), I('two', '⭐⭐', 'two', 'deux', 'اثنان'), I('three', '⭐⭐⭐', 'three', 'trois', 'ثلاثة'),
    I('four', '⭐⭐⭐⭐', 'four', 'quatre', 'أربعة'), I('five', '⭐⭐⭐⭐⭐', 'five', 'cinq', 'خمسة'),
  ]),
  TOPIC('home', '🏠', 'La maison', 'Home', 'البيت', [
    I('house', '🏠', 'house', 'maison', 'بيت'), I('bed', '🛏️', 'bed', 'lit', 'سرير'), I('door', '🚪', 'door', 'porte', 'باب'), I('lamp', '💡', 'lamp', 'lampe', 'مصباح'), I('key', '🔑', 'key', 'clé', 'مفتاح'), I('teddy', '🧸', 'teddy bear', 'nounours', 'دبدوب'),
  ]),
  TOPIC('vehicles', '🚗', 'Véhicules', 'Vehicles', 'مركبات', [
    I('car', '🚗', 'car', 'voiture', 'سيارة'), I('bus', '🚌', 'bus', 'bus', 'حافلة'), I('train', '🚆', 'train', 'train', 'قطار'), I('plane', '✈️', 'plane', 'avion', 'طائرة'), I('bike', '🚲', 'bike', 'vélo', 'دراجة'), I('boat', '⛵', 'boat', 'bateau', 'قارب'),
  ]),
  TOPIC('school', '🎒', "L'école", 'School', 'المدرسة', [
    I('book', '📖', 'book', 'livre', 'كتاب'), I('pencil', '✏️', 'pencil', 'crayon', 'قلم رصاص'), I('bag', '🎒', 'school bag', 'cartable', 'حقيبة'), I('scissors', '✂️', 'scissors', 'ciseaux', 'مقص'), I('paint', '🎨', 'paint', 'peinture', 'طلاء'), I('clock', '⏰', 'clock', 'horloge', 'ساعة'),
  ]),
  TOPIC('weather', '🌦️', 'La météo', 'Weather', 'الطقس', [
    I('sun', '☀️', 'sun', 'soleil', 'شمس'), I('rain', '🌧️', 'rain', 'pluie', 'مطر'), I('cloud', '☁️', 'cloud', 'nuage', 'سحابة'), I('snow', '❄️', 'snow', 'neige', 'ثلج'), I('wind', '💨', 'wind', 'vent', 'ريح'), I('umbrella', '☂️', 'umbrella', 'parapluie', 'مظلة'),
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
  ST('my-family', '👨‍👩‍👧', 'Ma famille', 'My family', 'عائلتي', [
    ['This is my family.', 'Voici ma famille.', 'هذه عائلتي.'],
    ['I love my mother.', 'J\'aime ma maman.', 'أحب أمي.'],
    ['I love my father.', 'J\'aime mon papa.', 'أحب أبي.'],
    ['We eat together.', 'Nous mangeons ensemble.', 'نأكل معًا.'],
    ['I love my family!', 'J\'aime ma famille !', 'أحب عائلتي!'],
  ]),
  ST('rainy-day', '🌧️', 'Un jour de pluie', 'A rainy day', 'يوم ممطر', [
    ['It is a rainy day.', 'Il pleut aujourd\'hui.', 'اليوم ممطر.'],
    ['I take my umbrella.', 'Je prends mon parapluie.', 'آخذ مظلتي.'],
    ['The rain is cold.', 'La pluie est froide.', 'المطر بارد.'],
    ['I go home.', 'Je rentre à la maison.', 'أعود إلى البيت.'],
    ['I drink warm milk.', 'Je bois du lait chaud.', 'أشرب حليبًا دافئًا.'],
  ]),
  ST('sunny-day', '☀️', 'Une belle journée', 'A sunny day', 'يوم مشمس', [
    ['Today is a sunny day.', 'Aujourd\'hui, il y a du soleil.', 'اليوم مشمس.'],
    ['I go to the park.', 'Je vais au parc.', 'أذهب إلى الحديقة.'],
    ['I see a bird.', 'Je vois un oiseau.', 'أرى طائرًا.'],
    ['The bird says hello.', 'L\'oiseau dit bonjour.', 'يقول الطائر مرحبًا.'],
    ['I say hello too!', 'Moi aussi je dis bonjour !', 'وأنا أيضًا أقول مرحبًا!'],
  ]),
  ST('beach', '🏖️', 'À la plage', 'At the beach', 'على الشاطئ', [
    ['We go to the beach.', 'Nous allons à la plage.', 'نذهب إلى الشاطئ.'],
    ['The sea is blue.', 'La mer est bleue.', 'البحر أزرق.'],
    ['I play in the sand.', 'Je joue dans le sable.', 'ألعب في الرمل.'],
    ['I see a big fish.', 'Je vois un gros poisson.', 'أرى سمكة كبيرة.'],
    ['I love the beach!', 'J\'aime la plage !', 'أحب الشاطئ!'],
  ]),
  ST('bedtime', '🌙', 'L\'heure de dormir', 'Bedtime', 'وقت النوم', [
    ['It is night.', 'Il fait nuit.', 'إنه الليل.'],
    ['I brush my teeth.', 'Je me brosse les dents.', 'أنظّف أسناني.'],
    ['I hug my teddy bear.', 'Je serre mon nounours.', 'أحضن دبدوبي.'],
    ['Mom says good night.', 'Maman dit bonne nuit.', 'تقول لي أمي: تصبح على خير.'],
    ['Good night, moon!', 'Bonne nuit, la lune !', 'تصبح على خير يا قمر!'],
  ]),
  ST('school-day', '🏫', "À l'école", 'At school', 'في المدرسة', [
    ['I go to school.', "Je vais à l'école.", 'أذهب إلى المدرسة.'],
    ['I open my bag.', "J'ouvre mon cartable.", 'أفتح حقيبتي.'],
    ['I read a book.', 'Je lis un livre.', 'أقرأ كتابًا.'],
    ['I draw with a pencil.', 'Je dessine avec un crayon.', 'أرسم بقلم الرصاص.'],
    ['I like school!', "J'aime l'école !", 'أحب المدرسة!'],
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
