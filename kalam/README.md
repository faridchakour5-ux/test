# Kalam : l'application mobile

Application de conversation pour apprendre l'anglais et le français en parlant (Expo + React Native + TypeScript).
Vue d'ensemble, décisions et recettes : `docs/ARCHITECTURE.md` (à la racine du dépôt).

## Lancer
```
npm install
npx expo start      # scanner le QR code avec l'app Expo Go
npm test            # tests
npm run lint        # qualité du code
npm run typecheck   # vérification TypeScript
```
Le professeur IA passe par le serveur du dossier `backend/` (adresse dans `EXPO_PUBLIC_API_URL`, voir `.env.example`).
Le micro ne fonctionne pas dans Expo Go : il faut un build de développement (`PUBLISHING.md`, section 6).

## Structure (`src/`)
- `domain/` : la logique pure (leçons, niveaux, révision espacée, progression, prononciation, tour de parole)
- `screens/` et `components/` : les écrans et leurs briques
- `speech/` : voix, micro, découpage du texte parlé
- `api/` : dialogue avec le serveur (réponse simple et en flux)
- `state/` : état de l'app, sauvegarde sur l'appareil, export des données
- `theme/` : palettes (clair/sombre, contraste vérifié) et profils d'âge (enfant, adulte, senior)
- `i18n/` : textes de l'interface en 5 langues (français, anglais, arabe, espagnol, chinois), arabe de droite à gauche

Règle de sécurité : **aucune clé API dans l'app** (un test le vérifie). Seul le serveur parle à l'IA.
