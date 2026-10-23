# Kalam

Apprendre les langues en parlant. Monorepo:
- `kalam/` : application mobile (Expo, React Native, TypeScript)
- `backend/` : serveur qui garde la clé API et appelle le professeur IA

## Lancer en local
```
cd backend && npm install && ANTHROPIC_API_KEY=sk-... npm start
cd kalam && npm install && EXPO_PUBLIC_API_URL=http://<IP-de-votre-PC>:8787 npx expo start
```
Sur téléphone, `localhost` ne marche pas: utilisez l'IP de votre ordinateur sur le réseau.

Tests: `npm test` dans chaque dossier. Publication: voir `PUBLISHING.md`.

## Qualité
- `npm test` dans `kalam/` (145 tests dont l'écran de conversation) et dans `backend/` (27 tests).
- Icônes et visuel Play Store : `node scripts/make-assets.mjs` (Playwright requis).
- Fiche Play Store dans 5 langues : `kalam/store/listing.md`.
