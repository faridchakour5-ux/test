# Comment Kalam est construit (et pourquoi)

Ce document explique l'application pour quelqu'un qui apprend à programmer : **où est quoi**, **comment les pièces
se parlent**, et **pourquoi** chaque choix a été fait. Les chemins cités entre accents graves existent vraiment
(un test automatique le vérifie : `kalam/src/docs.test.ts`).

## 1. En une phrase

Une application mobile (Expo / React Native / TypeScript) dans laquelle on **parle** avec un professeur IA, qui tourne
via un petit serveur : la clé de l'IA ne quitte jamais le serveur.

```
 Téléphone (app Expo)                 Serveur (Node.js)                 IA
 ┌───────────────────────┐   HTTPS   ┌──────────────────────┐          ┌─────────────┐
 │ écrans + logique      │ ────────▶ │ valide, filtre, limite│ ───────▶ │ API Claude  │
 │ voix + micro (système)│ ◀──────── │ garde la clé secrète  │ ◀─────── │             │
 └───────────────────────┘ réponse / └──────────────────────┘          └─────────────┘
   données stockées ICI      flux
   (jamais envoyées)
```

## 2. Plan du dépôt

| Dossier | Rôle |
|---|---|
| `kalam/` | L'application mobile |
| `kalam/src/domain/` | **La logique pure** : leçons, niveaux, révision espacée, progression, prononciation, tour de parole. Aucun code d'interface : facile à tester |
| `kalam/src/screens/` | Les écrans (accueil, conversation, révision, réglages, mode enfant…) |
| `kalam/src/components/` | Les petites briques réutilisables (boutons, mascotte, graphique de la semaine…) |
| `kalam/src/speech/` | La voix (synthèse), le micro (reconnaissance) et le découpage du texte parlé |
| `kalam/src/api/` | Le dialogue avec le serveur (réponse simple, réponse en flux, nouvelles tentatives) |
| `kalam/src/state/` | L'état de l'app et sa sauvegarde sur l'appareil, l'export des données |
| `kalam/src/navigation/` | Le bouton « retour » physique d'Android (`useHardwareBack`): même effet que le bouton « Retour » de l'écran, jamais la fermeture de l'app depuis un sous-écran |
| `kalam/src/notifications/` | Le rappel quotidien (notification locale, désactivé par défaut) |
| `kalam/src/diagnostics/` | Le diagnostic de l'appareil : vérifie serveur, voix, micro et rappels en un geste |
| `kalam/src/theme/` | Couleurs (palettes vérifiées pour la lisibilité), profils d'âge (enfant, adulte, senior) |
| `kalam/src/i18n/` | Les textes de l'interface, un fichier par langue |
| `kalam/src/util/` | Petits utilitaires (expressions régulières tolérantes) |
| `backend/` | Le serveur : `backend/src/app.js` (routes), `backend/src/prompt.js` (consignes de l'IA), `backend/src/validate.js` (validation), `backend/src/pii.js` (données personnelles), `backend/src/rateLimit.js` (limites) |
| `backend/test/` | Les tests du serveur, dont `backend/test/fakeServer.js` (vrai serveur, fausse IA) |
| `kalam/app.config.js`, `kalam/scripts/appId.js` | Identifiant d'application réglable (`KALAM_APP_ID`) et contrôles de construction de production |
| `.github/workflows/ci.yml` | La vérification automatique à chaque envoi de code |
| `PRIVACY.md`, `PUBLISHING.md` | Confidentialité et mise en ligne |

## 3. Les couches de l'application

Le principe : **les décisions se prennent dans `domain/` (code pur), les écrans ne font qu'afficher et brancher.**

```
 screens ──▶ components
    │
    ├──▶ state  (sauvegarde)   ──▶ domain  (règles pures)
    ├──▶ speech (voix, micro)
    └──▶ api    (serveur)
```

Pourquoi ? Un calcul pur (« quel est mon niveau ? », « quand revoir ce mot ? ») se teste en une ligne, sans téléphone
ni écran. Quand un bug apparaît, on sait où chercher.

Exemples : `kalam/src/domain/srs.ts` (révision espacée), `kalam/src/domain/level.ts` (test de niveau),
`kalam/src/domain/progress.ts` (série de jours, points, défi du jour), `kalam/src/domain/voiceTurn.ts`
(qui parle, quand : écoute, envoi, réponse, lecture).

## 4. Parcours d'un message (ce qui se passe quand on parle)

1. **Micro** : `kalam/src/speech/recognizer.ts` écoute une phrase (patience réglée par profil d'âge) et gère permissions, réseau et annulation.
2. **Tour de parole** : `kalam/src/domain/voiceTurn.ts` décide de la phase (`idle → listening → sending → speaking`). C'est une *machine à états* : elle empêche, par exemple, d'écouter pendant que le professeur parle (sinon le micro capterait sa voix).
3. **Envoi** : `kalam/src/api/teacher.ts` envoie la conversation au serveur, avec délai d'attente et nouvelles tentatives.
4. **Serveur** : `backend/src/app.js` valide la requête, masque les données personnelles, applique les limites, puis interroge l'IA avec les consignes de `backend/src/prompt.js` (langue enseignée, niveau, âge, scénario).
5. **Réponse en flux** (si activée) : le texte arrive par morceaux ; `kalam/src/speech/sentences.ts` coupe en phrases ; `kalam/src/speech/tts.ts` les lit l'une après l'autre.
6. **Sauvegarde** : `kalam/src/state/conversations.ts` garde la conversation sur l'appareil (regroupée toutes les 500 ms).
7. **Relecture de la sauvegarde** : `kalam/src/state/normalize.ts` vérifie chaque champ au démarrage; une valeur abîmée est remplacée par une valeur sûre (le consentement micro des enfants vaut « refusé » au moindre doute).

## 5. Décisions importantes et leurs raisons

| Décision | Raison |
|---|---|
| La clé de l'IA n'est **que** sur le serveur | Tout ce qui est dans l'app peut être extrait. Un test (`kalam/src/security.test.ts`) vérifie que le code de l'app ne cite ni clé ni adresse du fournisseur d'IA |
| Aucun chat libre avec l'IA pour les enfants | Moins on envoie de données d'enfant, moins il y a de risques. Le mode enfant est entièrement local |
| Données stockées sur l'appareil, sauvegarde automatique désactivée | Cohérent avec la promesse de `PRIVACY.md`. L'utilisateur peut exporter ses données |
| Le serveur filtre les données personnelles (e-mail, téléphone, adresse) | Défense en plus des consignes de l'IA : un enfant qui en écrit une est refusé, un adulte est masqué |
| Prénoms du mode à deux filtrés strictement | Ils finissent dans les consignes de l'IA : sinon, on pourrait y glisser une instruction |
| Journaux du serveur sans contenu ni IP | Diagnostiquer une panne sans stocker de données d'utilisateur |
| Permissions Android : Internet et micro seulement | Moins de permissions, moins de défiance, formulaire Play Store exact |
| Un niveau, des cartes et des leçons **par langue apprise** | Sinon, finir une leçon en anglais la marquerait « faite » en français |
| Réponse en flux derrière un drapeau (`EXPO_PUBLIC_STREAMING=1`) | Gain de rapidité réel mais non testé sur appareil : désactivé tant que non éprouvé |

## 6. Comment on teste (et pourquoi autant)

| Type | Où | Ce que ça attrape |
|---|---|---|
| Logique pure | `kalam/src/domain/*.test.ts` | Règles : niveaux, révision, progression, prononciation |
| Composants et écrans | `kalam/src/screens/*.test.tsx`, `kalam/src/components/*.test.tsx` | Affichage, boutons, voix et micro simulés |
| Application complète | `kalam/src/App.integration.test.tsx` | Navigation, sauvegarde, migration d'anciennes sauvegardes |
| **Contrat app ↔ serveur** | `kalam/src/api/contract.test.ts` | Le vrai client parle à un vrai serveur : détecte toute divergence de format |
| Accessibilité | `kalam/src/screens/accessibility.test.tsx` | Chaque bouton a un nom lisible, dans 5 langues × 3 profils |
| Serveur | `backend/test/*.test.js` | Validation, limites, flux, journaux |
| Sécurité du code | `kalam/src/security.test.ts` | Aucune clé ni adresse d'IA dans le code de l'app |
| Confidentialité | `kalam/src/privacy.test.ts` | Aucun outil de suivi ou de publicité, réseau limité au professeur et au diagnostic, champs de requête fixés |
| Déploiement du serveur | `backend/test/deploy.test.js` | Clé jamais dans le dépôt, serveur sans droits administrateur, santé vérifiée, budget actif |

**Les tests eux-mêmes doivent être vérifiés.** Technique utilisée dans ce projet (« test de mutation ») :
casser volontairement le code à un endroit, relancer les tests, et vérifier qu'ils **échouent**. Un test qui passe
quand le code est cassé ne protège de rien. L'outil Stryker le fait automatiquement (des centaines de cassures d'un coup) :
les scores obtenus sont dans `docs/ETAT.md`, et chaque score faible a mené à de nouveaux tests, parfois à un vrai bug corrigé.

Commandes : `cd kalam && npm test` (app), `npm run lint`, `npm run typecheck` ; `cd backend && npm test` (serveur).
La CI (`.github/workflows/ci.yml`) les lance à chaque envoi.

## 7. Recettes

**Ajouter une leçon** : ajoutez-la dans `kalam/src/domain/lessons.ts`, puis ses traductions dans
`kalam/src/domain/translations.ts` (mots et titre). Si une traduction manque, l'application et les tests le signalent.
**Ajouter des mots à une leçon** : toujours **à la fin** de sa liste. Les cartes de révision déjà enregistrées pointent sur « leçon:numéro », donc réordonner ou insérer au milieu changerait le sens des cartes des utilisateurs (un test fige les 4 premiers mots de chaque leçon).

**Ajouter une langue d'interface** : un fichier dans `kalam/src/i18n/locales/` typé pour avoir exactement les mêmes clés
que le français (une clé oubliée empêche la compilation), puis `kalam/src/i18n/strings.ts`, les traductions du contenu
(`kalam/src/domain/translations.ts`), les noms de palettes (`kalam/src/theme/palettes.ts`) et la liste du serveur
(`backend/src/validate.js`, `backend/src/prompt.js`).

**Ajouter une langue à apprendre** : `kalam/src/domain/targets.ts` (code, voix, noms), 12 questions dans
`kalam/src/domain/level.ts`, puis le serveur (`backend/src/validate.js`, `backend/src/prompt.js`). Attention : les langues
sans espaces entre les mots (chinois) ou à écriture arabe demandent un traitement propre de la prononciation.

**Ajouter une palette** : `kalam/src/theme/palettes.ts`. Un test refuse toute combinaison trop peu lisible.

## 8. Pièges rencontrés (leçons apprises)

- **Un test aléatoire est un test instable** : la question de l'espace parents était tirée au hasard et le test échouait 1 fois sur 4. Fixer le hasard.
- **Un moteur JavaScript peut refuser une syntaxe** : une expression régulière Unicode non comprise planterait l'app au lancement. Voir `kalam/src/util/safeRegex.ts`.
- **`fetch` n'est pas le même partout** : dans l'environnement de test d'Expo il est simulé. Le test de contrat utilise donc un vrai transport.
- **Un enchaînement de commandes peut masquer un échec** : `commande | tail` renvoie le code de `tail`, pas celui de `commande`. Un push échoué est passé inaperçu une fois.
- **Un nouveau jour n'est pas une nouvelle activité** : l'accueil montrait les minutes d'hier tant qu'on n'avait pas étudié aujourd'hui. Même piège avec la série de jours : elle restait affichée après un jour sauté (`currentStreak` dans `kalam/src/domain/progress.ts`).
- **Rien ne doit attendre indéfiniment** : une liste de voix qui ne répond jamais bloquait tout le diagnostic. Chaque attente a un délai (`kalam/src/diagnostics/diagnostics.ts`).
- **Un morceau réseau peut couper n'importe où** : même au milieu d'un retour à la ligne Windows (`kalam/src/api/sse.ts`). Les tests découpent donc le flux à chaque position possible.
- **Les versions des modules doivent être celles du SDK Expo** : le stockage local était en version 3 alors qu'Expo teste la 2.2.0. Un test (`kalam/src/dependencies.test.ts`) compare `package.json` à la liste officielle du SDK. Pour ajouter un module : `npx expo install <module>` (ou, sans accès au service Expo, la version indiquée dans `kalam/node_modules/expo/bundledNativeModules.json`).
- **Sur Android récent, l'application passe sous les barres du système** : sans marge, les boutons du bas se cachent derrière la barre de navigation. `kalam/src/components/AppFrame.tsx` réserve ces marges pour tous les écrans (et ne double pas celles que les écrans prévoient déjà en haut).
- **Regarder l'écran trouve ce que les tests ne voient pas** : le blocage du diagnostic n'est apparu qu'en l'affichant dans un navigateur.

## 9. Glossaire

- **CI** : vérification automatique du code à chaque envoi.
- **Machine à états** : un ensemble de situations possibles et de règles pour passer de l'une à l'autre.
- **Répétition espacée** : revoir un mot juste avant de l'oublier, de plus en plus rarement s'il est bien su.
- **SSE** : façon d'envoyer une réponse par morceaux au fil de l'eau.
- **Mutation (test de)** : casser le code exprès pour vérifier que les tests le voient.
