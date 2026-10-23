# Où en est Kalam ? (à lire en premier)

Ce fichier dit, en mots simples, ce qui est fait, ce qui ne l'est pas, et ce que vous devez faire vous-même.

## Ce qui est fait et vérifié automatiquement
- Conversation écrite et vocale avec un professeur IA, en anglais ou en français (l'arabe et les autres langues viendront plus tard).
- Trois univers: enfants, adultes, seniors. Mode enfant sans envoi de données, micro désactivé par défaut, portail parental protégé contre les essais au hasard.
- Leçons, test de niveau, révision espacée, objectifs sans culpabilisation, progression, mode à deux, mode « Parle librement ».
- Données seulement sur le téléphone; export et effacement (RGPD). Aucune clé d'API dans l'application: seul le serveur (`backend/`) parle à l'IA.
- Chaque envoi de code relance les tests, le lint et la vérification des types (`.github/workflows/ci.yml`).

## Ce qui n'a jamais été essayé (il faut un vrai téléphone)
L'application a été regardée à l'écran dans un navigateur (rendu web, 390 px de large) pour juger la mise en page; le micro et la voix, eux, n'existent pas dans ce rendu.
Le micro, la voix et la réponse en flux ne sont testés qu'avec des modules simulés. Sur un téléphone Android:
1. Construisez le build de développement (`PUBLISHING.md`, section 6).
2. Essayez une conversation vocale complète, une prononciation, et couper l'application en pleine écoute.
3. Notez ce qui ne va pas et corrigez-le avant toute publication.

## Ce que vous devez faire vous-même
- Choisir l'identifiant d'application (remplacer `com.kalam.app`) avant le premier envoi sur Google Play.
- Déployer le serveur et donner son adresse à EAS (`PUBLISHING.md`, sections 1 et 2).
- Ne jamais partager vos identifiants (Google, Apple, clé d'API) dans un chat.

## Pour aller plus loin
`docs/ARCHITECTURE.md` explique comment tout est construit, `docs/APPRENDRE.md` propose des exercices pour apprendre à programmer sur ce projet.
