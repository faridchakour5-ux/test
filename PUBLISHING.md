# Publier Kalam sur Google Play (.aab)

Cible actuelle: Android uniquement (fichier .aab pour Google Play). iOS n'est pas travaillé pour le moment.

Tout se fait depuis VOTRE ordinateur: les identifiants Google ne doivent jamais être partagés dans un chat.

## 1. Backend (obligatoire avant le test réel)
1. Créez une clé API sur console.anthropic.com.
2. Déployez `backend/` : le plus simple est Render > New > Blueprint (le fichier `render.yaml` est prêt). Saisissez `ANTHROPIC_API_KEY` dans le tableau de bord, jamais dans le dépôt.
3. Variables utiles :
   - `TRUST_PROXY` = **nombre de proxys de confiance** entre Internet et votre serveur (`1` pour un seul). Chaque proxy ajoute l'adresse du client à la FIN de `X-Forwarded-For`; le serveur lit l'entrée à cette position en partant de la droite (le début de l'en-tête est falsifiable par le client). Trop petit: plusieurs utilisateurs partagent une limite (30 requêtes/minute en commun). Trop grand: l'adresse peut être falsifiée. Sur Render, commencez par `1`, puis vérifiez avec deux téléphones sur des réseaux différents que chacun a sa propre limite; si ce n'est pas le cas, essayez `2` (Render passe par un équilibreur et un réseau de diffusion). Une valeur invalide (ex. `true`) empêche le démarrage.
   - `DAILY_REQUEST_LIMIT` = plafond de requêtes par jour (UTC) pour borner la facture de l'API. Une valeur qui n'est pas un entier (ex. `20k`) empêche le démarrage au lieu de désactiver le plafond en silence; `0` = illimité. Une panne du fournisseur ne consomme pas le budget.
4. Testez `GET https://votre-serveur/health` : la réponse doit contenir `"configured":true`.
5. Mettez cette URL dans `EXPO_PUBLIC_API_URL` avant de construire l'app (HTTPS obligatoire).

## 2. Build Android (.aab)
**Avant le tout premier envoi: choisissez votre identifiant d'application.** `com.kalam.app` est un exemple et peut déjà être pris sur Google Play. L'identifiant ne peut plus changer après le premier envoi. Aucun fichier à modifier: donnez-le à EAS dans la variable `KALAM_APP_ID` (par exemple `com.votrenom.kalam`, voir la commande `eas env:create` ci-dessous). Il s'applique à Android et à iOS (`kalam/app.config.js`), et un identifiant mal formé fait échouer la construction tout de suite avec un message clair. De même, un build `production` sans `EXPO_PUBLIC_API_URL` en https échoue à la construction (avec la commande à lancer) au lieu de livrer une app qui ne peut parler à aucun serveur.

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

## 5. iOS (reporté)
Pas prévu pour l'instant. Si un jour: compte Apple Developer, `eas build --platform ios`.

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

## 9. Alertes `npm audit` sur node-forge et zod (connues, sans effet sur l'app)
`npm audit` signale `node-forge` (via `expo` → `@expo/cli`) et `zod` (via le lint `eslint-config-expo`). Ce sont deux outils de développement, absents de l'app installée. `node-forge` sert à signer les mises à jour EAS Update (non utilisées ici): aucun des deux n'est **jamais** dans le code de l'application installée sur les téléphones. Ne lancez pas `npm audit fix --force`: il proposerait de revenir à Expo 44 et casserait le projet. À reprendre quand Expo publie une version qui met à jour ces dépendances. Le serveur (`backend/`) n'a aucune alerte.

## 10. Rappel quotidien (notifications)
Le rappel est une notification locale (`expo-notifications`), sans serveur. Il fonctionne dans le build de développement et le build de production, pas dans Expo Go sur Android. À essayer sur un vrai téléphone: activer le rappel, choisir une heure proche, fermer l'application, attendre la notification, puis redémarrer le téléphone et vérifier qu'il sonne encore le lendemain. Sur Android 13 et plus, l'autorisation « Notifications » est demandée à l'activation; sur certains téléphones, l'économiseur de batterie peut retarder la notification de quelques minutes (c'est voulu: pas d'alarme exacte, pas de permission sensible).


## 11. Envoi automatique sur Google Play (GitHub Actions, sans EAS)
Le fichier `.github/workflows/play-release.yml` construit le `.aab` signé avec VOTRE clé et l'envoie sur Google Play. Il se lance seulement à la main (Actions > « Envoi sur Google Play » > Run workflow) et s'arrête tout de suite, en listant ce qui manque, tant que les secrets ne sont pas là. Rien de secret n'est dans le dépôt, et rien ne doit passer par un chat.

**À faire une seule fois, par vous (l'API de Google Play ne peut pas le faire):**
1. Play Console: créer l'application (identifiant = votre `KALAM_APP_ID`), remplir « Sécurité des données », classification du contenu, public cible (voir `kalam/store/listing.md`), puis envoyer à la main un premier `.aab` en test interne (le `.aab` du job `android-aab` de la CI ou un build EAS). Activer « Signature d'application par Google Play » (par défaut): votre clé ci-dessous n'est alors qu'une clé d'envoi, remplaçable en cas de perte.
2. Créer la clé d'envoi sur VOTRE ordinateur (Java requis), puis la sauvegarder en lieu sûr (perte = démarches de réinitialisation auprès de Google):
   `keytool -genkeypair -v -storetype PKCS12 -keystore kalam-upload.jks -alias kalam -keyalg RSA -keysize 2048 -validity 10000`
3. Play Console > Configuration > Accès à l'API: créer un compte de service avec le droit « Publier des versions », télécharger sa clé JSON.
4. GitHub > Settings > Secrets and variables > Actions, créer ces secrets: `KALAM_APP_ID`, `EXPO_PUBLIC_API_URL` (https), `KALAM_KEYSTORE_BASE64` (résultat de `base64 -w0 kalam-upload.jks`), `KALAM_KEYSTORE_PASSWORD`, `KALAM_KEY_ALIAS` (`kalam`), `KALAM_KEY_PASSWORD`, `PLAY_SERVICE_ACCOUNT_JSON` (contenu du fichier JSON).
5. Facultatif mais conseillé: Settings > Environments > `play-release` > exiger votre approbation avant chaque envoi.

**À chaque version:** lancer le workflow en donnant un numéro de version plus grand que le précédent (le premier envoi manuel vaut souvent 1: mettez 2, puis 3...), la piste (`internal` pour commencer) et l'état `draft` (la version attend votre validation dans la Play Console). Les tests, le lint et la vérification des types passent avant la construction. Le script `kalam/scripts/signRelease.js` (testé) échoue plutôt que de signer en mode débogage si le projet natif change de forme.

## 12. Adresse publique de la politique de confidentialité
Google Play demande une adresse web publique. Une fois `PRIVACY.md` relu (le texte est un brouillon: retirez « BROUILLON » du titre et renseignez le contact après validation), activez GitHub > Settings > Pages > Source = « GitHub Actions », puis lancez Actions > « Publier la politique de confidentialité » > Run workflow. L'adresse sera `https://<votre-compte>.github.io/<dépôt>/privacy.html`: collez-la dans la Play Console (fiche > Politique de confidentialité). Relancez le workflow après chaque modification de `PRIVACY.md`.
