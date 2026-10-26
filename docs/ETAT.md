# Où en est Kalam ? (à lire en premier)

Ce fichier dit, en mots simples, ce qui est fait, ce qui ne l'est pas, et ce que vous devez faire vous-même.

## Ce qui est fait et vérifié automatiquement
- Conversation écrite et vocale avec un professeur IA, en anglais ou en français (l'arabe et les autres langues viendront plus tard).
- Trois univers: enfants, adultes, seniors. Mode enfant sans envoi de données, micro désactivé par défaut, portail parental protégé contre les essais au hasard.
- Leçons (34 situations de la vie courante, 6 mots chacune, niveaux A1 à B1), test de niveau, révision espacée, objectifs sans culpabilisation, progression, mode à deux, mode « Parle librement ».
- Mode enfant: 9 thèmes de jeu (animaux, fruits, couleurs, corps, nourriture, chiffres, maison, véhicules, école) et 8 histoires courtes, tout local.
- Interface en 5 langues (français, anglais, arabe de droite à gauche, espagnol, chinois). Au premier lancement, elle suit la langue du téléphone (anglais si elle n'est pas proposée); le choix de la personne est ensuite sauvegardé et prime. Les traductions ont été écrites sans relecteur natif: une relecture avant la publication est recommandée.
- Diagnostic de l'appareil dans les réglages (serveur, voix, micro, rappels).
- Rappel quotidien facultatif (notification locale, désactivé par défaut, jamais pour les enfants).
- Données seulement sur le téléphone; export et effacement (RGPD). Aucune clé d'API dans l'application: seul le serveur (`backend/`) parle à l'IA.
- Chaque envoi de code relance les tests, le lint et la vérification des types (`.github/workflows/ci.yml`), en trois fuseaux horaires pour la série de jours.
- Solidité des tests mesurée par « test de mutation » (on casse le code exprès et on compte les cassures détectées): révision espacée 97 %, progression 95 %, prononciation 94 %, reconnaissance vocale 92 %, relecture de sauvegarde 95 %, portail parental 87 %, découpage des phrases 85 %, synthèse vocale 76 %, client réseau 88 %, messages d'erreur vocaux 100 %, leçons 93 %, stockage local 91 %, tour de parole vocal 100 %, flux de réponse 91 %, serveur 89 % (validation et consignes des professeurs à 100 %). L'application elle-même (navigation, parcours enfant, sauvegarde) est à 78–89 %, le défi du jour à 85 %. L'écran de conversation est à 64 %. Les écrans (portail parental, jeu et histoires des enfants, révision, accueils, réglages) sont à 56–63 %: ce qui reste est surtout du style visuel (couleurs, tailles), que ce genre de test ne peut pas juger. Les autres cas restants sont surtout des doubles protections équivalentes.

## Ce qui n'a jamais été essayé (il faut un vrai téléphone)
L'application a été regardée à l'écran dans un navigateur (rendu web, 390 px de large) pour juger la mise en page; le micro et la voix, eux, n'existent pas dans ce rendu.
Le micro, la voix, la réponse en flux et le rappel quotidien (notification à l'heure choisie, même après un redémarrage) ne sont testés qu'avec des modules simulés. Sur un téléphone Android:
1. Construisez le build de développement (`PUBLISHING.md`, section 6).
2. Ouvrez Réglages → « 🩺 Diagnostic de l'appareil »: en quelques secondes, il vérifie le serveur, les voix (anglais et français), le micro et les rappels, et affiche pour chaque point ✓, ⚠ ou ✗ avec une explication. Les boutons « Entendre une phrase » et « Dire une phrase » testent la voix et le micro tout de suite.
3. Essayez une conversation vocale complète, une prononciation, et couper l'application en pleine écoute.
4. Notez ce qui ne va pas (une capture du diagnostic aide beaucoup) et corrigez-le avant toute publication.

## Ce que vous devez faire vous-même
- Choisir l'identifiant d'application avant le premier envoi sur Google Play et le donner à EAS dans `KALAM_APP_ID` (aucun fichier à modifier, `PUBLISHING.md` section 2).
- Déployer le serveur et donner son adresse à EAS (`PUBLISHING.md`, sections 1 et 2).
- Ne jamais partager vos identifiants (Google, Apple, clé d'API) dans un chat.

## Pour aller plus loin
`docs/ARCHITECTURE.md` explique comment tout est construit, `docs/APPRENDRE.md` propose des exercices pour apprendre à programmer sur ce projet.
