# Kalam

Apprendre les langues en parlant. Monorepo:
- `kalam/` : application mobile (Expo, React Native, TypeScript)
- `backend/` : serveur qui garde la clé API et appelle le professeur IA

## Documentation
- `docs/ETAT.md` : où en est le projet, ce qui reste à faire et ce que vous devez faire vous-même (à lire en premier).
- `docs/ARCHITECTURE.md` : comment l'application est construite et pourquoi (plan du dépôt, parcours d'un message, décisions, tests, recettes).
- `docs/APPRENDRE.md` : un parcours d'exercices pour apprendre à programmer sur ce projet.
- `PRIVACY.md` (confidentialité) et `PUBLISHING.md` (mise en ligne).

## Lancer en local
```
cd backend && npm install && ANTHROPIC_API_KEY=sk-... npm start
cd kalam && npm install && EXPO_PUBLIC_API_URL=http://<IP-de-votre-PC>:8787 npx expo start
```
Sur téléphone, `localhost` ne marche pas: utilisez l'IP de votre ordinateur sur le réseau.
Le micro (reconnaissance vocale) ne fonctionne pas dans Expo Go : il faut un build de développement (voir `PUBLISHING.md`, section 6).

Tests: `npm test` dans chaque dossier. Publication: voir `PUBLISHING.md`.

## Qualité
- Tests : `npm test` dans `kalam/` (application : logique, écrans, accessibilité, application complète, contrat avec le serveur) et dans `backend/` (serveur). Vérifications en plus : `npm run lint` et `npm run typecheck` dans `kalam/`.
- Tout est relancé automatiquement à chaque envoi de code (`.github/workflows/ci.yml`): tests dans trois fuseaux horaires, compilation du bundle Android, contrôle de la configuration de production.
- Un écran « Diagnostic de l'appareil » (Réglages) vérifie en un geste serveur, voix, micro et rappels sur le téléphone.
- Icônes et visuel Play Store : `cd kalam && node scripts/make-assets.mjs` (Playwright requis).
- Fiche Play Store dans 5 langues : `kalam/store/listing.md`.

## Langues
- **Langues apprises** : anglais et français (l'arabe, l'espagnol et d'autres viendront plus tard).
- **Langues de l'interface** : français, anglais, arabe (droite-à-gauche), espagnol, chinois.
- Le niveau, la révision du vocabulaire et les leçons terminées sont suivis séparément pour chaque langue apprise.
