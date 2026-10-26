// 36 leçons d'anglais organisées par situations (CEFR A1 -> B1), pas par listes de mots.
import { UiLang } from '../i18n/strings';
import { DEFAULT_TARGET, TargetLang, lessonKey } from './targets';
import { LESSON_TITLES_TR, VOCAB_TR } from './translations';

export type Level = 'A1' | 'A2' | 'B1';

export interface VocabItem {
  en: string;
  fr: string;
  ar: string;
  es: string;
  zh: string;
}

// Sens d'un mot dans la langue de l'interface. Pour une interface anglaise (langue apprise), on garde le français.
export const meaning = (v: VocabItem, lang: UiLang, target: TargetLang = DEFAULT_TARGET): string =>
  lang === target ? (target === 'en' ? v.fr : v.en) : v[lang];

export interface Lesson {
  id: string;
  level: Level;
  title: Record<UiLang, string>;
  scenario: string; // consigne donnée au professeur IA pour le jeu de rôle
  vocab: VocabItem[];
}

const L = (
  id: string,
  level: Level,
  fr: string,
  en: string,
  ar: string,
  scenario: string,
  vocab: [string, string][],
): Lesson => {
  const tr = LESSON_TITLES_TR[id];
  if (!tr) throw new Error(`titre manquant pour la leçon ${id}`);
  return {
    id, level, title: { fr, en, ar, es: tr.es, zh: tr.zh }, scenario,
    vocab: vocab.map(([e, f]) => {
      const v = VOCAB_TR[e];
      if (!v) throw new Error(`traduction manquante: ${e}`);
      return { en: e, fr: f, ar: v.ar, es: v.es, zh: v.zh };
    }),
  };
};

export const LESSONS: Lesson[] = [
  L('greetings', 'A1', 'Se présenter', 'Introducing yourself', 'التعريف بالنفس', 'You meet a new person for the first time.', [['Hello', 'Bonjour'], ['My name is', 'Je m\'appelle'], ['Nice to meet you', 'Enchanté'], ['How are you?', 'Comment ça va ?'], ['Goodbye', 'Au revoir'], ['Please', 'S\'il vous plaît']]),
  L('family', 'A1', 'La famille', 'Family', 'العائلة', 'You talk about your family with a friend.', [['mother', 'mère'], ['father', 'père'], ['brother', 'frère'], ['sister', 'sœur'], ['daughter', 'fille'], ['son', 'fils']]),
  L('numbers', 'A1', 'Chiffres et prix', 'Numbers and prices', 'الأرقام والأسعار', 'You ask the price of things in a small shop.', [['How much is it?', 'Combien ça coûte ?'], ['cheap', 'pas cher'], ['expensive', 'cher'], ['I will take it', 'Je le prends'], ['How many?', 'Combien ?'], ['change', 'la monnaie']]),
  L('restaurant', 'A1', 'Au restaurant', 'At the restaurant', 'في المطعم', 'You are a customer ordering food; the teacher is the waiter.', [['menu', 'carte'], ['I would like', 'Je voudrais'], ['water', 'eau'], ['the bill, please', 'l\'addition, s\'il vous plaît'], ['delicious', 'délicieux'], ['a table for two', 'une table pour deux']]),
  L('directions', 'A1', 'Demander son chemin', 'Asking directions', 'السؤال عن الطريق', 'You are lost in a city and ask a passer-by for directions.', [['turn left', 'tournez à gauche'], ['turn right', 'tournez à droite'], ['straight ahead', 'tout droit'], ['Where is...?', 'Où est... ?'], ['next to', 'à côté de'], ['far', 'loin']]),
  L('daily', 'A1', 'Ma journée', 'My day', 'يومي', 'You describe your daily routine to a new colleague.', [['wake up', 'se réveiller'], ['breakfast', 'petit-déjeuner'], ['go to work', 'aller au travail'], ['go to bed', 'se coucher'], ['take a shower', 'prendre une douche'], ['have lunch', 'déjeuner']]),
  L('shopping', 'A2', 'Faire les courses', 'Shopping', 'التسوق', 'You buy clothes in a shop; the teacher is the shop assistant.', [['size', 'taille'], ['try on', 'essayer'], ['discount', 'réduction'], ['receipt', 'ticket de caisse'], ['cash', 'en espèces'], ['I am just looking', 'Je regarde seulement']]),
  L('transport', 'A2', 'Les transports', 'Transport', 'المواصلات', 'You buy a train ticket at the station.', [['ticket', 'billet'], ['platform', 'quai'], ['delay', 'retard'], ['return ticket', 'aller-retour'], ['bus stop', 'arrêt de bus'], ['one-way ticket', 'aller simple']]),
  L('doctor', 'A2', 'Chez le médecin', 'At the doctor', 'عند الطبيب', 'You do not feel well and describe your symptoms to a doctor.', [['headache', 'mal de tête'], ['fever', 'fièvre'], ['prescription', 'ordonnance'], ['It hurts here', 'J\'ai mal ici'], ['cough', 'toux'], ['appointment', 'rendez-vous']]),
  L('hotel', 'A2', 'À l\'hôtel', 'At the hotel', 'في الفندق', 'You check in at a hotel reception.', [['reservation', 'réservation'], ['key', 'clé'], ['single room', 'chambre simple'], ['check out', 'quitter la chambre'], ['breakfast included', 'petit-déjeuner compris'], ['double room', 'chambre double']]),
  L('weather', 'A2', 'La météo', 'The weather', 'الطقس', 'You make small talk about the weather.', [['sunny', 'ensoleillé'], ['rainy', 'pluvieux'], ['cold', 'froid'], ['It is going to rain', 'Il va pleuvoir'], ['windy', 'venteux'], ['snow', 'neige']]),
  L('school', 'A2', 'À l\'école', 'At school', 'في المدرسة', 'You talk to a teacher about your homework.', [['homework', 'devoirs'], ['exam', 'examen'], ['subject', 'matière'], ['I do not understand', 'Je ne comprends pas'], ['teacher', 'professeur'], ['notebook', 'cahier']]),
  L('phone', 'A2', 'Au téléphone', 'On the phone', 'على الهاتف', 'You call a company to ask for information.', [['Can I speak to', 'Puis-je parler à'], ['hold on', 'ne quittez pas'], ['leave a message', 'laisser un message'], ['call back', 'rappeler'], ['wrong number', 'faux numéro'], ['speak louder', 'parlez plus fort']]),
  L('hobbies', 'A2', 'Loisirs', 'Hobbies', 'الهوايات', 'You discuss your hobbies with a new friend.', [['I like', 'J\'aime'], ['play football', 'jouer au football'], ['read books', 'lire des livres'], ['free time', 'temps libre'], ['swim', 'nager'], ['listen to music', 'écouter de la musique']]),
  L('job', 'B1', 'Entretien d\'embauche', 'Job interview', 'مقابلة عمل', 'You are in a job interview; the teacher is the interviewer.', [['experience', 'expérience'], ['strength', 'point fort'], ['salary', 'salaire'], ['apply for', 'postuler à'], ['skills', 'compétences'], ['team player', 'esprit d\'équipe']]),
  L('meeting', 'B1', 'Réunion de travail', 'Work meeting', 'اجتماع عمل', 'You give your opinion in a team meeting.', [['agenda', 'ordre du jour'], ['deadline', 'date limite'], ['I agree', 'Je suis d\'accord'], ['in my opinion', 'à mon avis'], ['schedule', 'calendrier'], ['postpone', 'reporter']]),
  L('travel', 'B1', 'Voyager', 'Travelling', 'السفر', 'You are at the airport and handle check-in and security.', [['boarding pass', 'carte d\'embarquement'], ['luggage', 'bagages'], ['customs', 'douane'], ['gate', 'porte d\'embarquement'], ['passport', 'passeport'], ['flight', 'vol']]),
  L('opinions', 'B1', 'Donner son avis', 'Giving opinions', 'إبداء الرأي', 'You debate a simple topic with a friend and give reasons.', [['I think that', 'Je pense que'], ['however', 'cependant'], ['because', 'parce que'], ['on the other hand', 'd\'autre part'], ['I disagree', 'Je ne suis pas d\'accord'], ['for example', 'par exemple']]),
  L('problems', 'B1', 'Résoudre un problème', 'Solving a problem', 'حل مشكلة', 'You complain politely about a faulty product and ask for a solution.', [['refund', 'remboursement'], ['broken', 'cassé'], ['complaint', 'réclamation'], ['replace', 'remplacer'], ['warranty', 'garantie'], ['out of order', 'en panne']]),
  L('bank', 'A2', 'À la banque', 'At the bank', 'في البنك', 'You are at a bank counter asking to open an account and withdraw money.', [['account', 'compte'], ['withdraw money', 'retirer de l\'argent'], ['deposit', 'dépôt'], ['bank card', 'carte bancaire'], ['loan', 'prêt'], ['transfer', 'virement']]),
  L('pharmacy', 'A2', 'À la pharmacie', 'At the pharmacy', 'في الصيدلية', 'You buy medicine at a pharmacy and ask how to take it.', [['medicine', 'médicament'], ['allergic', 'allergique'], ['twice a day', 'deux fois par jour'], ['side effects', 'effets secondaires'], ['pain', 'douleur'], ['without a prescription', 'sans ordonnance']]),
  L('neighbors', 'A1', 'Les voisins', 'Neighbours', 'الجيران', 'You politely talk to your neighbour about noise.', [['neighbour', 'voisin'], ['noisy', 'bruyant'], ['borrow', 'emprunter'], ['I am sorry', 'je suis désolé'], ['quiet', 'calme'], ['party', 'fête']]),
  L('time', 'A1', 'Dire l\'heure', 'Telling the time', 'قول الوقت', 'You ask for the time and arrange a meeting time with a friend.', [['What time is it?', 'Quelle heure est-il ?'], ['o\'clock', 'pile (heure)'], ['half past', 'et demie'], ['I am late', 'je suis en retard'], ['quarter past', 'et quart'], ['on time', 'à l\'heure']]),
  L('clothes', 'A1', 'Les vêtements', 'Clothes', 'الملابس', 'You describe clothes you want to buy in a shop.', [['shirt', 'chemise'], ['shoes', 'chaussures'], ['jacket', 'veste'], ['too small', 'trop petit'], ['dress', 'robe'], ['too big', 'trop grand']]),
  L('cinema', 'A2', 'Au cinéma', 'At the cinema', 'في السينما', 'You buy cinema tickets and snacks.', [['movie', 'film'], ['seat', 'place'], ['popcorn', 'pop-corn'], ['subtitles', 'sous-titres'], ['screen', 'écran'], ['trailer', 'bande-annonce']]),
  L('rent', 'B1', 'Louer un appartement', 'Renting a flat', 'استئجار شقة', 'You visit a flat and ask the landlord about the rent and contract.', [['landlord', 'propriétaire'], ['rent', 'loyer'], ['contract', 'contrat'], ['furnished', 'meublé'], ['security deposit', 'caution'], ['utilities included', 'charges comprises']]),
  L('news', 'B1', 'Les actualités', 'The news', 'الأخبار', 'You discuss a news story with a friend and give your view.', [['headline', 'gros titre'], ['according to', 'selon'], ['in the future', 'à l\'avenir'], ['it depends', 'ça dépend'], ['breaking news', 'dernières nouvelles'], ['journalist', 'journaliste']]),
  L('emergency', 'A2', 'Urgences', 'Emergencies', 'الطوارئ', 'You report an emergency on the phone calmly and clearly.', [['Help!', 'Au secours !'], ['ambulance', 'ambulance'], ['accident', 'accident'], ['call the police', 'appeler la police'], ['fire', 'incendie'], ['I need a doctor', 'J\'ai besoin d\'un médecin']]),
  L('goals', 'B1', 'Mes objectifs', 'My goals', 'أهدافي', 'You talk about your goals for next year.', [['goal', 'objectif'], ['improve', 's\'améliorer'], ['achieve', 'réussir à atteindre'], ['in the long run', 'à long terme'], ['dream', 'rêve'], ['step by step', 'pas à pas']]),
  L('market', 'A1', 'Au marché', 'At the market', 'في السوق', 'You buy fruit and vegetables at a market stall.', [['vegetables', 'légumes'], ['a kilo of', 'un kilo de'], ['fresh', 'frais'], ['bag', 'sac'], ['How much is a kilo?', 'Combien coûte le kilo ?'], ['That is all, thank you', 'C\'est tout, merci']]),
  L('sports', 'A2', 'Le sport', 'Sports', 'الرياضة', 'You talk about the sports you play and watch with a friend.', [['team', 'équipe'], ['match', 'match'], ['win', 'gagner'], ['lose', 'perdre'], ['training', 'entraînement'], ['I am a fan of', 'Je suis fan de']]),
  L('holidays', 'A2', 'Les vacances', 'Holidays', 'العطلات', 'You tell a friend about your last holiday.', [['beach', 'plage'], ['suitcase', 'valise'], ['sightseeing', 'visite touristique'], ['I had a great time', 'J\'ai passé un super moment'], ['souvenir', 'souvenir'], ['book a trip', 'réserver un voyage']]),
  L('technology', 'B1', 'La technologie', 'Technology', 'التكنولوجيا', 'You call a help desk to solve a problem with your phone.', [['password', 'mot de passe'], ['download', 'télécharger'], ['battery', 'batterie'], ['update', 'mise à jour'], ['Wi-Fi', 'Wi-Fi'], ['it does not work', 'ça ne marche pas']]),
  L('invitation', 'A2', 'Une invitation', 'An invitation', 'دعوة', 'You invite a friend to your birthday party and talk about what to bring.', [['invite', 'inviter'], ['party', 'fête'], ['gift', 'cadeau'], ['Are you free on Saturday?', 'Es-tu libre samedi ?'], ['I would love to come', 'Je viendrais avec plaisir'], ['bring', 'apporter']]),
  L('environment', 'B1', 'L\'environnement', 'The environment', 'البيئة', 'You discuss how to protect the environment with a colleague.', [['recycle', 'recycler'], ['pollution', 'pollution'], ['energy', 'énergie'], ['waste', 'déchets'], ['climate change', 'changement climatique'], ['save water', 'économiser l\'eau']]),
  L('free', 'B1', 'Parle librement', 'Free talk', 'تحدث بحرية', 'Free conversation: the learner chooses the topic.', [['by the way', 'au fait'], ['actually', 'en fait'], ['I wonder if', 'je me demande si'], ['let me explain', 'laissez-moi expliquer'], ['to be honest', 'honnêtement'], ['what do you mean?', 'que veux-tu dire ?']]),
];

export const getLesson = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id);

// Leçons conseillées: celles du niveau de l'apprenant non encore faites, puis du niveau suivant.
export function recommendLessons(level: Level, completed: string[], n = 3, target: TargetLang = DEFAULT_TARGET): Lesson[] {
  const order: Level[] = ['A1', 'A2', 'B1'];
  const start = order.indexOf(level);
  const todo = (l: Lesson) => !completed.includes(lessonKey(l.id, target)) && l.id !== 'free';
  const result: Lesson[] = [];
  for (const lvl of order.slice(start)) {
    for (const l of LESSONS) if (l.level === lvl && todo(l) && result.length < n) result.push(l);
  }
  return result;
}
