# Publier Kalam sur Google Play (.aab) puis l'App Store

Tout se fait depuis VOTRE ordinateur: les identifiants Google/Apple ne doivent jamais être partagés dans un chat.

## 1. Backend (obligatoire avant le test réel)
1. Créez une clé API sur console.anthropic.com.
2. Déployez `backend/` (Render, Railway, Fly.io…) avec la variable `ANTHROPIC_API_KEY`.
3. Définissez `ALLOWED_ORIGIN` et testez `GET /health`.

## 2. Build Android (.aab)
```
npm i -g eas-cli
cd kalam
eas login
eas build:configure
EXPO_PUBLIC_API_URL=https://votre-backend eas build --platform android --profile production
```
EAS génère et garde la clé de signature pour vous.

## 3. Envoi à la Play Console
Première version: envoyez le `.aab` à la main (Play Console > Test interne > Créer une version).
Pour automatiser ensuite: créez un compte de service (Play Console > Accès à l'API), enregistrez le JSON hors du dépôt, puis `eas submit --platform android`.

## 4. Fiche Play Store à remplir
- Politique de confidentialité: `PRIVACY.md` (hébergez-la sur une URL publique).
- Section Sécurité des données et classification du contenu.
- Si l'app cible des enfants: programme « Famille » obligatoire (COPPA/RGPD) avant d'activer le mode enfant.

## 5. iOS plus tard
Compte Apple Developer (99 $/an), `eas build --platform ios`, `eas submit --platform ios`.

## 6. Tester la prononciation (build de développement)
La reconnaissance vocale est un module natif: elle ne marche PAS dans Expo Go (l'app l'indique poliment).
Pour la tester sur votre téléphone Android:
```
cd kalam
eas build --platform android --profile development
```
Installez l'APK obtenu, puis `npx expo start --dev-client`.
Les builds `preview` et `production` incluent déjà le micro.
