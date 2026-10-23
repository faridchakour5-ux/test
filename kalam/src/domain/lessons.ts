// 20 leçons d'anglais organisées par situations (CEFR A1 -> B1), pas par listes de mots.
export type Level = 'A1' | 'A2' | 'B1';

export interface VocabItem {
  en: string;
  fr: string;
}

export interface Lesson {
  id: string;
  level: Level;
  title: { fr: string; en: string; ar: string };
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
): Lesson => ({ id, level, title: { fr, en, ar }, scenario, vocab: vocab.map(([e, f]) => ({ en: e, fr: f })) });

export const LESSONS: Lesson[] = [
  L('greetings', 'A1', 'Se présenter', 'Introducing yourself', 'التعريف بالنفس', 'You meet a new person for the first time.', [['Hello', 'Bonjour'], ['My name is', 'Je m\'appelle'], ['Nice to meet you', 'Enchanté'], ['How are you?', 'Comment ça va ?']]),
  L('family', 'A1', 'La famille', 'Family', 'العائلة', 'You talk about your family with a friend.', [['mother', 'mère'], ['father', 'père'], ['brother', 'frère'], ['sister', 'sœur']]),
  L('numbers', 'A1', 'Chiffres et prix', 'Numbers and prices', 'الأرقام والأسعار', 'You ask the price of things in a small shop.', [['How much is it?', 'Combien ça coûte ?'], ['cheap', 'pas cher'], ['expensive', 'cher'], ['I will take it', 'Je le prends']]),
  L('restaurant', 'A1', 'Au restaurant', 'At the restaurant', 'في المطعم', 'You are a customer ordering food; the teacher is the waiter.', [['menu', 'carte'], ['I would like', 'Je voudrais'], ['water', 'eau'], ['the bill, please', 'l\'addition, s\'il vous plaît']]),
  L('directions', 'A1', 'Demander son chemin', 'Asking directions', 'السؤال عن الطريق', 'You are lost in a city and ask a passer-by for directions.', [['turn left', 'tournez à gauche'], ['turn right', 'tournez à droite'], ['straight ahead', 'tout droit'], ['Where is...?', 'Où est... ?']]),
  L('daily', 'A1', 'Ma journée', 'My day', 'يومي', 'You describe your daily routine to a new colleague.', [['wake up', 'se réveiller'], ['breakfast', 'petit-déjeuner'], ['go to work', 'aller au travail'], ['go to bed', 'se coucher']]),
  L('shopping', 'A2', 'Faire les courses', 'Shopping', 'التسوق', 'You buy clothes in a shop; the teacher is the shop assistant.', [['size', 'taille'], ['try on', 'essayer'], ['discount', 'réduction'], ['receipt', 'ticket de caisse']]),
  L('transport', 'A2', 'Les transports', 'Transport', 'المواصلات', 'You buy a train ticket at the station.', [['ticket', 'billet'], ['platform', 'quai'], ['delay', 'retard'], ['return ticket', 'aller-retour']]),
  L('doctor', 'A2', 'Chez le médecin', 'At the doctor', 'عند الطبيب', 'You do not feel well and describe your symptoms to a doctor.', [['headache', 'mal de tête'], ['fever', 'fièvre'], ['prescription', 'ordonnance'], ['It hurts here', 'J\'ai mal ici']]),
  L('hotel', 'A2', 'À l\'hôtel', 'At the hotel', 'في الفندق', 'You check in at a hotel reception.', [['reservation', 'réservation'], ['key', 'clé'], ['single room', 'chambre simple'], ['check out', 'quitter la chambre']]),
  L('weather', 'A2', 'La météo', 'The weather', 'الطقس', 'You make small talk about the weather.', [['sunny', 'ensoleillé'], ['rainy', 'pluvieux'], ['cold', 'froid'], ['It is going to rain', 'Il va pleuvoir']]),
  L('school', 'A2', 'À l\'école', 'At school', 'في المدرسة', 'You talk to a teacher about your homework.', [['homework', 'devoirs'], ['exam', 'examen'], ['subject', 'matière'], ['I do not understand', 'Je ne comprends pas']]),
  L('phone', 'A2', 'Au téléphone', 'On the phone', 'على الهاتف', 'You call a company to ask for information.', [['Can I speak to', 'Puis-je parler à'], ['hold on', 'ne quittez pas'], ['leave a message', 'laisser un message'], ['call back', 'rappeler']]),
  L('hobbies', 'A2', 'Loisirs', 'Hobbies', 'الهوايات', 'You discuss your hobbies with a new friend.', [['I like', 'J\'aime'], ['play football', 'jouer au football'], ['read books', 'lire des livres'], ['free time', 'temps libre']]),
  L('job', 'B1', 'Entretien d\'embauche', 'Job interview', 'مقابلة عمل', 'You are in a job interview; the teacher is the interviewer.', [['experience', 'expérience'], ['strength', 'point fort'], ['salary', 'salaire'], ['apply for', 'postuler à']]),
  L('meeting', 'B1', 'Réunion de travail', 'Work meeting', 'اجتماع عمل', 'You give your opinion in a team meeting.', [['agenda', 'ordre du jour'], ['deadline', 'date limite'], ['I agree', 'Je suis d\'accord'], ['in my opinion', 'à mon avis']]),
  L('travel', 'B1', 'Voyager', 'Travelling', 'السفر', 'You are at the airport and handle check-in and security.', [['boarding pass', 'carte d\'embarquement'], ['luggage', 'bagages'], ['customs', 'douane'], ['gate', 'porte d\'embarquement']]),
  L('opinions', 'B1', 'Donner son avis', 'Giving opinions', 'إبداء الرأي', 'You debate a simple topic with a friend and give reasons.', [['I think that', 'Je pense que'], ['however', 'cependant'], ['because', 'parce que'], ['on the other hand', 'd\'autre part']]),
  L('problems', 'B1', 'Résoudre un problème', 'Solving a problem', 'حل مشكلة', 'You complain politely about a faulty product and ask for a solution.', [['refund', 'remboursement'], ['broken', 'cassé'], ['complaint', 'réclamation'], ['replace', 'remplacer']]),
  L('free', 'B1', 'Parle librement', 'Free talk', 'تحدث بحرية', 'Free conversation: the learner chooses the topic.', [['by the way', 'au fait'], ['actually', 'en fait'], ['I wonder if', 'je me demande si'], ['let me explain', 'laissez-moi expliquer']]),
];

export const getLesson = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id);
