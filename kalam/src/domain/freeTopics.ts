import { UiLang } from '../i18n/strings';

// Sujets proposés dans le mode « Parle librement ». L'apprenant choisit; le professeur s'adapte à son niveau.
export interface FreeTopic {
  id: string;
  emoji: string;
  title: Record<UiLang, string>;
  scenario: string; // consigne donnée au professeur IA
}

const F = (id: string, emoji: string, fr: string, en: string, ar: string, es: string, zh: string, subject: string): FreeTopic => ({
  id, emoji, title: { fr, en, ar, es, zh },
  scenario: `Free conversation about: ${subject}. Let the learner lead, ask follow-up questions, and keep to this topic.`,
});

export const FREE_TOPICS: FreeTopic[] = [
  F('daily', '🏠', 'Ma vie de tous les jours', 'My daily life', 'حياتي اليومية', 'Mi vida diaria', '我的日常生活', 'the learner\'s daily life and routine'),
  F('travel', '✈️', 'Voyages', 'Travel', 'السفر', 'Viajes', '旅行', 'travel, places visited and dream destinations'),
  F('food', '🍝', 'Cuisine et repas', 'Food and cooking', 'الطعام والطبخ', 'Comida y cocina', '美食与烹饪', 'food, favourite dishes and cooking'),
  F('work', '💼', 'Travail et études', 'Work and studies', 'العمل والدراسة', 'Trabajo y estudios', '工作与学习', 'work, studies and future plans'),
  F('hobbies', '🎨', 'Loisirs et sport', 'Hobbies and sport', 'الهوايات والرياضة', 'Aficiones y deporte', '爱好与运动', 'hobbies, sport and free time'),
  F('family', '👨‍👩‍👧', 'Famille et amis', 'Family and friends', 'العائلة والأصدقاء', 'Familia y amigos', '家人和朋友', 'family, friends and relationships'),
  F('dreams', '🌟', 'Rêves et projets', 'Dreams and plans', 'الأحلام والخطط', 'Sueños y proyectos', '梦想与计划', 'dreams, goals and plans for the future'),
  F('culture', '🎬', 'Films, musique, culture', 'Films, music and culture', 'الأفلام والموسيقى والثقافة', 'Cine, música y cultura', '电影、音乐和文化', 'films, music, books and culture'),
];

export const getFreeTopic = (id: string | null | undefined): FreeTopic | undefined => FREE_TOPICS.find((t) => t.id === id);

// La leçon qui utilise le choix libre du sujet.
export const FREE_LESSON_ID = 'free';
