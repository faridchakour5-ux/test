# Publier Kalam sur Google Play (.aab) puis l'App Store

Tout se fait depuis VOTRE ordinateur: les identifiants Google/Apple ne doivent jamais être partagés dans un chat.

## 1. Backend (obligatoire avant le test réel)
1. Créez une clé API sur console.anthropic.com.
2. Déployez `backend/` : le plus simple est Render > New > Blueprint (le fichier `render.yaml` est prêt). Saisissez `ANTHROPIC_API_KEY` dans le tableau de bord, jamais dans le dépôt.
3. Variables utiles : `TRUST_PROXY=1` derrière un hébergeur (sinon tous les utilisateurs partagent une limite), `DAILY_REQUEST_LIMIT` pour plafonner la facture de l'API par jour.
4. Testez `GET https://votre-serveur/health` : la réponse doit contenir `"configured":true`.
5. Mettez cette URL dans `EXPO_PUBLIC_API_URL` avant de construire l'app (HTTPS obligatoire).

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

## 7. Réponse en flux (le professeur parle dès sa première phrase)
Le serveur expose `POST /chat/stream` (SSE) en plus de `POST /chat`. L'app l'utilise si `EXPO_PUBLIC_STREAMING=1` au moment du build (désactivé par défaut).
- Si la lecture au fil de l'eau n'est pas disponible sur l'appareil, l'app lit toute la réponse puis la rejoue: aucun risque de blocage.
- Une coupure réseau en plein flux garde le texte déjà reçu, sans jamais relancer la requête (cela répéterait des phrases à voix haute).
- À tester d'abord sur un vrai téléphone avant de l'activer pour tous. Derrière un proxy, vérifiez qu'il ne met pas les réponses en mémoire tampon (l'en-tête `X-Accel-Buffering: no` est déjà envoyé).

## 8. Diagnostiquer une panne
Chaque réponse du serveur porte un en-tête `X-Request-Id`, repris dans le journal (`{"evt":"request","id":...,"status":...,"ms":...}`). Un utilisateur qui signale un problème peut donc être relié à une ligne du journal, sans jamais stocker ses messages ni son adresse IP.
