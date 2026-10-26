# Apprendre à programmer avec Kalam : un parcours pas à pas

Le meilleur moyen d'apprendre est de **modifier un vrai projet qui a des tests** : si vous cassez quelque chose, les tests
vous le disent tout de suite. Lisez d'abord `docs/ARCHITECTURE.md`, puis faites ces exercices dans l'ordre.

Avant de commencer :

```bash
cd kalam
npm install
npm test            # tout doit être vert avant que vous ne touchiez à quoi que ce soit
```

**Règle d'or** : après chaque petit changement, relancez `npm test`. Ne changez jamais plusieurs choses d'un coup.

## Niveau 1 : lire et changer une valeur

1. **Changer l'objectif par défaut** : dans `kalam/src/domain/progress.ts`, repérez `dailyGoalMinutes: 10` dans `initialProgress`. Mettez 20, lancez `npm test`. Un test échoue ? Lisez son message : il vous dit ce qui dépendait de cette valeur. Remettez 10.
2. **Lire une règle** : ouvrez `kalam/src/domain/progress.ts` et trouvez `levelFromXp`. Sans lancer le code, dites combien de points il faut pour le niveau 5. Vérifiez avec un test dans `kalam/src/domain/domain.test.ts`.
3. **Ajouter un sujet de conversation** : dans `kalam/src/domain/freeTopics.ts`, ajoutez un sujet avec ses 5 traductions. Le test `kalam/src/domain/freeTopics.test.ts` vous guide : il refuse un sujet incomplet.

## Niveau 2 : ajouter une fonctionnalité simple

4. **Ajouter une palette de couleurs** dans `kalam/src/theme/palettes.ts`. Un test vérifie le contraste (lisibilité) de chaque combinaison : vous allez devoir ajuster vos couleurs jusqu'à ce qu'il passe. C'est exactement ce qu'on appelle « l'accessibilité testée ».
5. **Ajouter une histoire pour les enfants** (`kalam/src/domain/kids.ts` et `kalam/src/domain/translations.ts`) : 5 phrases, traduites dans les langues. Si vous oubliez une traduction, l'app refuse de démarrer : lisez l'erreur.
6. **Ajouter une leçon** (voir la recette dans `docs/ARCHITECTURE.md`).

## Niveau 3 : comprendre un mécanisme

7. **La révision espacée** : lisez `kalam/src/domain/srs.ts` (une trentaine de lignes). Écrivez sur papier ce qui arrive à une carte réussie 3 fois de suite, puis vérifiez avec `kalam/src/domain/deck.test.ts`.
8. **La machine à états de la voix** : lisez `kalam/src/domain/voiceTurn.ts` et son test. Dessinez le schéma des phases (`idle`, `listening`, `sending`, `speaking`). Pourquoi `LISTEN` est-il ignoré pendant `speaking` ?
9. **Le contrat entre l'app et le serveur** : lancez seulement `npx jest src/api/contract`. Puis, dans `backend/src/app.js`, renommez le champ `reply` en `answer` et relancez : combien de tests échouent ? Remettez `reply`. Vous venez de pratiquer un **test de mutation**.

## Niveau 4 : penser comme un professionnel

10. **Écrire le test AVANT le code** : choisissez une petite règle (par exemple « un défi du jour ne tombe jamais deux jours de suite sur le même type »). Écrivez d'abord le test qui échoue, puis le code qui le fait passer.
11. **Chasser un test instable** : lancez la suite 5 fois de suite avec `for i in 1 2 3 4 5; do npm test; done`. Un test qui échoue parfois est un bug (voir « Pièges rencontrés » dans `docs/ARCHITECTURE.md`).
12. **Relire un changement** : faites `git diff` avant chaque commit et relisez-le comme si c'était le code de quelqu'un d'autre.

## Niveau 5 : de votre ordinateur à Google Play

13. **Lire une chaîne de contrôle** : ouvrez `.github/workflows/ci.yml` et, pour chaque étape (typecheck, lint, tests dans 3 fuseaux, bundle Android, manifeste, `.aab`), écrivez en une phrase quelle erreur elle attrape. Puis cassez volontairement une chose (ajoutez `android.permission.CAMERA` dans `blockedPermissions`... à l'envers : retirez `RECORD_AUDIO` du plugin micro) sur une branche de test et regardez quelle étape devient rouge.
14. **Comprendre la signature** : lisez `kalam/scripts/signRelease.js` et `kalam/src/signRelease.test.ts`. Pourquoi les mots de passe restent-ils dans l'environnement et jamais dans le fichier ? Pourquoi le script échoue-t-il bruyamment plutôt que de signer en mode débogage ? (Indice: ce que Google Play ferait d'un `.aab` mal signé.)
15. **Une fiche de store testée** : lisez `kalam/src/storeListing.test.ts`. Raccourcissez le titre de la fiche à 31 caractères dans `kalam/store/listing.md` : quel test refuse ? Quelle limite de Google Play protège-t-il ?
16. **Un secret, ça se range où ?** Lisez `.github/workflows/play-release.yml`. Listez les 7 secrets et dites, pour chacun, qui le crée et où il est stocké. Pourquoi le workflow vérifie-t-il leur présence avant de commencer ?

## Travailler avec Claude Code (méthode)

- **Petites demandes, une à la fois** : « ajoute X et son test », pas « refais toute l'app ».
- **Donnez le critère de réussite** : « `npm test` doit rester vert ». L'assistant peut alors se vérifier lui-même.
- **Demandez de casser pour vérifier** : « casse volontairement ce code à un endroit et montre-moi que les tests échouent ». C'est la meilleure défense contre les faux tests.
- **Relisez ce qui est produit** : `git diff` et `git log` avant de pousser. Ne faites pas confiance, vérifiez.
- **Une branche par sujet** : le travail se fait sur une branche (`git switch -c ma-fonction`), jamais directement sur la branche principale.
- **Économiser les tokens sans perdre en fiabilité** : une session par sujet (`/clear` entre deux sujets, `/compact` quand elle s'allonge), des règles stables dans `CLAUDE.md` (relu à chaque session, donc court), des demandes qui nomment les fichiers, et un modèle plus léger pour les tâches simples (traductions, documentation). Ne supprimez jamais les tests ni la CI pour économiser: ils tournent chez GitHub, pas dans vos tokens, et évitent les corrections coûteuses plus tard.
- **Gardez les secrets hors du code** : une clé d'API va dans une variable d'environnement du serveur. Si vous en collez une dans un message ou un fichier, considérez-la comme compromise et recréez-en une.

## Pour aller plus loin

- Lire un test de bout en bout : `kalam/src/App.integration.test.tsx`.
- Comprendre une décision de sécurité : `PRIVACY.md` puis `kalam/src/security.test.ts`.
- Préparer une mise en ligne : `PUBLISHING.md`.
