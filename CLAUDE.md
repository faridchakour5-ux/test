# Kalam — règles du projet

Application mobile (Expo SDK 58, React Native, TypeScript) pour apprendre l'anglais et le français en parlant. Dossiers: `kalam/` (application), `backend/` (serveur Node qui parle à l'IA), `docs/`.
Lire d'abord `docs/ETAT.md` (état et tâches du propriétaire), puis `docs/ARCHITECTURE.md` si besoin.

## Langue et git
- Répondre en français, en mots simples.
- Branche de travail: `ccr-6e077f69-a10f4g`. Pousser avec `git push -u origin ccr-6e077f69-a10f4g`. Pas de pull request sauf demande.
- Fin de chaque message de commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` puis `Claude-Session: https://claude.ai/code/session_011NcysNX3SCJTgQdB21kJE4`.
- Aucun nom de modèle dans les fichiers du dépôt.

## Vérifier avant de pousser (dans `kalam/`)
- `npx tsc --noEmit && npx eslint . && npx jest`
- Serveur: `cd backend && npm test`
- La CI rejoue les tests dans 3 fuseaux horaires et compile les bundles Android et iOS.

## Règles à ne jamais casser
- Aucune clé d'API dans l'application: seul le serveur (`ANTHROPIC_API_KEY`) parle à l'IA. Ne jamais demander ni accepter d'identifiants.
- Mode enfant: rien envoyé au serveur, micro désactivé par défaut, jamais de rappel. `kalam/src/privacy.test.ts` garde cela (pas de suivi, pas de publicité, réseau limité).
- Langues apprises: seulement anglais et français. Interface: fr, en, ar (droite à gauche), es, zh.
- Nouveau vocabulaire d'une leçon: toujours AJOUTÉ À LA FIN (les cartes de révision sont `leçon:index`; `lessonsRules.test.ts` fige les 4 premiers mots).
- Nouveau thème ou histoire enfant: ajouter les traductions es/zh dans `kalam/src/domain/translations.ts` (clé = identifiant de l'objet, pas le mot anglais).
- Dépendances: versions imposées par `expo/bundledNativeModules.json` (`dependencies.test.ts`). Pas de `expo install` ici (réseau bloqué): `npm install` avec la version attendue.

## Pièges de test
- RNTL 14: `await render`, `await unmount`, `cleanup` en `afterEach`; `void fireEvent.press` si le gestionnaire ne se termine jamais.
- Tests de synthèse vocale: arrêter chaque instance créée en fin de test.
- Les tests de contenu doivent se déduire des données, pas de nombres figés.

## Ce que seul le propriétaire peut faire
Essai sur un vrai téléphone Android (Réglages → Diagnostic), `KALAM_APP_ID` et `EXPO_PUBLIC_API_URL` dans EAS, relecture des traductions par des locuteurs natifs. Détails dans `docs/ETAT.md` et `PUBLISHING.md`.
