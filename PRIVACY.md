# Politique de confidentialité de Kalam (BROUILLON — à faire valider par un juriste avant publication)

## Principes
- Aucune publicité. Aucune vente de données. Aucun pisteur publicitaire.
- Aucun compte n'est requis dans cette version.

## Mode ados / adultes / seniors
- Les messages de conversation sont envoyés à notre serveur, puis à un fournisseur d'IA pour générer la réponse du professeur. Un filtre masque avant l'envoi, autant que possible, les adresses e-mail, numéros de téléphone, adresses postales (rue, avenue, street, road…) et liens. C'est un filet de sécurité qui n'est pas exhaustif: ne saisissez pas de données personnelles.
- La progression (objectif, série, leçons, cartes de révision) et vos conversations sont stockées uniquement sur l'appareil, pour que vous puissiez les reprendre. La sauvegarde automatique du téléphone (Google/Apple) est désactivée pour Kalam : si vous changez de téléphone, utilisez « Exporter mes données » pour conserver votre historique. Le bouton « Effacer mes données » les supprime.
- Le micro (facultatif) est traité par le service de reconnaissance vocale du système (Android ou Apple), qui peut l'envoyer à Google ou Apple. Kalam ne reçoit et ne conserve aucun enregistrement audio.
- Côté serveur, le texte des messages n'est pas conservé par Kalam au-delà du traitement de la requête. Le journal technique du serveur contient uniquement un identifiant de requête aléatoire, la méthode, la route, le code de statut et la durée : **jamais le contenu des messages, jamais l'adresse IP**. L'adresse IP sert seulement, en mémoire vive et pendant quelques minutes, à limiter le nombre de requêtes par minute (protection contre les abus); elle n'est écrite nulle part. L'hébergeur du serveur peut tenir ses propres journaux réseau.

## Mode enfant (4-8 ans)
- Aucune donnée de l'enfant n'est envoyée à un serveur : pas de chat libre avec l'IA, pas de compte, pas d'identifiant publicitaire.
- Les étoiles, histoires lues et réglages sont stockés sur l'appareil seulement.
- Le micro est désactivé par défaut. Un parent peut l'activer dans l'espace parents, protégé par une question d'adulte (après 3 erreurs de suite, une pause de 30 secondes, de plus en plus longue, empêche de deviner au hasard). L'audio est traité par le service de reconnaissance vocale du système (Android ou Apple), qui peut l'envoyer à Google ou Apple selon l'appareil. Kalam ne conserve aucun enregistrement.
- Le parent peut limiter le temps quotidien et **effacer toutes les données** de l'appareil en un geste.
- Le consentement parental (date et version du texte) est enregistré localement sur l'appareil.

## Vos droits (RGPD)
Accès et portabilité (bouton « Exporter mes données » : toutes vos données en JSON lisible), rectification, effacement (bouton « Effacer mes données »). Contact : à renseigner (remplacez cette mention par votre adresse e-mail avant la publication).

## Points à valider avant la mise en ligne (INTERNE: retiré de la page publique)
- Programme « Famille » de Google Play et déclaration de l'audience cible (enfants) : obligatoire dès que l'app vise les moins de 13 ans.
- Mentions légales, contact du responsable de traitement, durée de conservation côté serveur (logs).
- Revue COPPA / RGPD-K (âge du consentement numérique variable selon les pays).

## Rappel quotidien (facultatif)
- Désactivé par défaut. La personne l'active dans les réglages et choisit l'heure; elle peut l'arrêter à tout moment. Après la première leçon terminée, l'accueil le propose UNE seule fois (« Oui, à 19:00 » ou « Non merci »); un refus n'est jamais redemandé.
- Le rappel est une notification **locale**, programmée sur l'appareil: aucun serveur Kalam n'envoie de notification, aucun jeton de notification n'est demandé ni stocké, aucune donnée n'est transmise.
- L'autorisation « Notifications » du système n'est demandée qu'au moment où la personne active le rappel.
- Jamais de rappel dans le profil enfant. Le message est doux et sans culpabilisation; il n'y a qu'un rappel par jour.
- Effacer les données (ou changer pour le profil enfant) arrête le rappel.


## Diagnostic de l'appareil
- Bouton « Diagnostic de l'appareil » dans les réglages (profils ados, adultes, seniors; jamais pour les enfants). Il vérifie le serveur, les voix, le micro et les rappels.
- Seule requête réseau: `GET /health` vers le serveur du professeur, **sans aucune donnée de l'utilisateur**. Le test du micro (« Dire une phrase ») utilise le même service de reconnaissance vocale du système que le reste de l'application (l'audio peut donc être traité par Google, comme décrit plus haut); Kalam garde le texte reconnu sur l'écran, sans l'enregistrer ni l'envoyer.

## Garde-fous automatiques (INTERNE: retiré de la page publique)
Un test (`kalam/src/privacy.test.ts`) échoue si quelqu'un ajoute un outil de suivi, de statistiques, de plantages à distance ou de publicité, une clé d'IA dans l'application, un appel réseau en dehors du client du professeur et du diagnostic, ou un champ supplémentaire dans les requêtes vers le professeur.
