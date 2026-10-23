# Kalam

Apprendre les langues en parlant. Monorepo:
- `kalam/` : application mobile (Expo, React Native, TypeScript)
- `backend/` : serveur qui garde la clé API et appelle le professeur IA

## Documentation
- `docs/ARCHITECTURE.md` : comment l'application est construite et pourquoi (plan du dépôt, parcours d'un message, décisions, tests, recettes).
- `docs/APPRENDRE.md` : un parcours d'exercices pour apprendre à programmer sur ce projet.
- `PRIVACY.md` (confidentialité) et `PUBLISHING.md` (mise en ligne).

## Lancer en local
```
cd backend && npm install && ANTHROPIC_API_KEY=sk-... npm start
cd kalam && npm install && EXPO_PUBLIC_API_URL=http://<IP-de-votre-PC>:8787 npx expo start
```
Sur téléphone, `localhost` ne marche pas: utilisez l'IP de votre ordinateur sur le réseau.

Tests: `npm test` dans chaque dossier. Publication: voir `PUBLISHING.md`.

## Qualité
- `npm test` dans `kalam/` (294 tests dont l'écran de conversation, le mode flux et un audit d'accessibilité) et dans `backend/` (44 tests).
- Icônes et visuel Play Store : `node scripts/make-assets.mjs` (Playwright requis).
- Fiche Play Store dans 5 langues : `kalam/store/listing.md`.

## Langues
- **Langues apprises** : anglais et français (l'arabe, l'espagnol et d'autres viendront plus tard).
- **Langues de l'interface** : français, anglais, arabe (droite-à-gauche), espagnol, chinois.
- Le niveau, la révision du vocabulaire et les leçons terminées sont suivis séparément pour chaque langue apprise.
