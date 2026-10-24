# Publier Kalam sur Google Play (.aab) puis l'App Store

Tout se fait depuis VOTRE ordinateur: les identifiants Google/Apple ne doivent jamais être partagés dans un chat.

## 1. Backend (obligatoire avant le test réel)
1. Créez une clé API sur console.anthropic.com.
2. Déployez `backend/` : le plus simple est Render > New > Blueprint (le fichier `render.yaml` est prêt). Saisissez `ANTHROPIC_API_KEY` dans le tableau de bord, jamais dans le dépôt.
3. Variables utiles : `TRUST_PROXY=1` derrière un hébergeur (sinon tous les utilisateurs partagent une limite), `DAILY_REQUEST_LIMIT` pour plafonner la facture de l'API par jour.
4. Testez `GET https://votre-serveur/health` : la réponse doit contenir `"configured":true`.
5. Mettez cette URL dans `EXPO_PUBLIC_API_URL` avant de construire l'app (HTTPS obligatoire).

## 2. Build Android (.aab)
**Avant le tout premier envoi: choisissez votre identifiant d'application.** `com.kalam.app` est un exemple et peut déjà être pris sur Google Play. L'identifiant ne peut plus changer après le premier envoi. Aucun fichier à modifier: donnez-le à EAS dans la variable `KALAM_APP_ID` (par exemple `com.votrenom.kalam`, voir la commande `eas env:create` ci-dessous). Il s'applique à Android et à iOS (`kalam/app.config.js`), et un identifiant mal formé fait échouer la construction tout de suite avec un message clair.

```
npm i -g eas-cli
cd kalam
eas login
eas build:configure
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://votre-backend --visibility plaintext
eas env:create --environment production --name KALAM_APP_ID --value com.votrenom.kalam --visibility plaintext
eas build --platform android --profile production
```
Le build se fait sur les serveurs d'EAS: une variable écrite devant la commande dans votre terminal (`EXPO_PUBLIC_API_URL=... eas build`) n'y est **pas** transmise, et l'application construite n'aurait alors aucune adresse de serveur. Donnez l'adresse à EAS avec `eas env:create` (ci-dessus) ou dans le bloc `env` du profil `production` de `kalam/eas.json`. Après le build, ouvrez l'application: si elle affiche une erreur de configuration du serveur, l'adresse n'a pas été prise en compte. (Cette étape n'a pas pu être vérifiée depuis l'environnement de développement: la documentation d'Expo y est bloquée.)

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

## 9. Alerte `npm audit` sur node-forge (connue, sans effet sur l'app)
`npm audit` signale `node-forge` (via `expo` → `@expo/cli`). C'est un outil de développement (signature des mises à jour EAS Update, non utilisées ici): il n'est **jamais** dans le code de l'application installée sur les téléphones. Ne lancez pas `npm audit fix --force`: il proposerait de revenir à Expo 44 et casserait le projet. À reprendre quand Expo publie une version qui met à jour `node-forge`. Le serveur (`backend/`) n'a aucune alerte.

## 10. Rappel quotidien (notifications)
Le rappel est une notification locale (`expo-notifications`), sans serveur. Il fonctionne dans le build de développement et le build de production, pas dans Expo Go sur Android. À essayer sur un vrai téléphone: activer le rappel, choisir une heure proche, fermer l'application, attendre la notification, puis redémarrer le téléphone et vérifier qu'il sonne encore le lendemain. Sur Android 13 et plus, l'autorisation « Notifications » est demandée à l'activation; sur certains téléphones, l'économiseur de batterie peut retarder la notification de quelques minutes (c'est voulu: pas d'alarme exacte, pas de permission sensible).

