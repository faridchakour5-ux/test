# Kalam

Application mobile de conversation pour apprendre les langues (Expo + React Native + TypeScript).

## Lancer
```
cd kalam
npm install
npx expo start      # scanner le QR code avec l'app Expo Go
npm test            # tests
npm run typecheck   # vérification TypeScript
```

## Structure
- `src/theme` : couleurs (clair/sombre/contraste élevé) et profils d'âge (enfant, adulte, senior)
- `src/components` : composants réutilisables (KText, KButton)
- `src/screens` : écrans
- `src/i18n` : textes d'interface (fr, en, ar) et gestion droite-à-gauche

Règle de sécurité : aucune clé API dans l'app. Le professeur IA passera par un backend.
