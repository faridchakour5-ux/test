# Zitoun — commande d'huile d'olive au Maroc

Application Android simple et élégante: le client choisit son **huile (de la plus douce à la plus intense)**, ses **litres**, le **jour et le créneau** de livraison, puis envoie la commande **par WhatsApp** au vendeur. Paiement à la livraison. Aucun serveur, aucun compte, aucun suivi: les informations du client restent sur son téléphone et ne partent que dans le message WhatsApp qu'il choisit d'envoyer.

Français et arabe (droite à gauche), mode clair et sombre, 6 combinaisons de couleurs (« dictionnaire de couleurs »), 3 tailles de texte.

## Ce que le client fait
1. **Commander** → il choisit une huile (intensité 1 à 5, région, prix au litre).
2. Il choisit le **conditionnement** (bouteille 1 L, bidons 2/5/10 L, jerrican 20 L) et le **nombre**. Des remises de volume s'appliquent au total de litres (10 L: 5 %, 20 L: 8 %, 50 L: 12 %).
3. **Livraison**: nom, téléphone marocain (06/07, vérifié), ville, adresse, **jour** (9 jours proposés, plus sur demande) et **créneau**. Livraison offerte dès 800 DH.
4. **Récapitulatif** → « Envoyer par WhatsApp »: le message est prêt, le vendeur confirme.
5. **Mes commandes**: historique et « Commander à nouveau ».

## ⚠️ À remplacer par VOS vraies informations
Tout est dans le code, en clair, avec des **exemples fictifs**:
- `src/domain/catalog.ts`: vos huiles (nom, région, variété, intensité 1-5, acidité, récolte, **prix au litre**) et les conditionnements (supplément par litre).
- `src/domain/delivery.ts`: villes desservies, **frais de livraison**, délai minimal.
- `src/domain/pricing.ts`: paliers de remise, seuil de livraison offerte (`FREE_DELIVERY_FROM`), plafond par commande.
- `src/config/shop.ts`: nom de la boutique, langue du message envoyé au vendeur.
- **Numéro WhatsApp du vendeur**: jamais écrit dans le code. Il vient du secret GitHub `ZITOUN_SELLER_WHATSAPP` (chiffres seulement, avec l'indicatif, ex. `212612345678`) au moment de la construction. Sans lui, l'application le dit clairement au client.
- Textes: `src/i18n/locales/fr.ts` et `ar.ts` (l'arabe est à faire relire par une personne dont c'est la langue).

## Essayer sur un téléphone
Dans Cloud Shell: `bash ~/test/zitoun/scripts/buildApk.sh 212612345678` (votre numéro WhatsApp). Le script construit un **APK d'essai** (15 à 20 minutes) et propose le téléchargement. Sur le téléphone: ouvrir le fichier, autoriser « Installer des applications inconnues » pour le navigateur ou le gestionnaire de fichiers. Cet APK sert à essayer, **pas** à publier.

## Vérifier avant de pousser (dans `zitoun/`)
`npx tsc --noEmit && npx eslint . && npx jest` — ajouter `npx jest --randomize --seed=N` pour vérifier que les tests ne dépendent pas de l'ordre.

## Identifiant Android
Par défaut `com.faridchakour.zitoun` (`app.json`). Réglable sans modifier de fichier avec la variable `ZITOUN_APP_ID`. Il devient **définitif** au premier envoi sur Google Play.

## Le fichier .aab (Google Play)
Dans Cloud Shell: `bash ~/test/zitoun/scripts/buildAab.sh 1` (le numéro est la version: 1 la première fois, puis 2, 3…). Le script lance le workflow **Zitoun .aab**, attend la fin (15 à 20 minutes) et propose le fichier en téléchargement. Il est signé avec votre clé d'envoi: celle de Kalam sert aussi pour Zitoun (secrets `KALAM_KEYSTORE_*`), sauf si vous créez des secrets `ZITOUN_KEYSTORE_*`. Secrets facultatifs: `ZITOUN_APP_ID` (sinon `com.faridchakour.zitoun`) et `ZITOUN_SELLER_WHATSAPP`. ⚠️ Le numéro WhatsApp, les huiles et les prix sont **intégrés au fichier à la construction**: reconstruisez-le après chaque changement.
Le tout premier envoi se fait à la main dans la Play Console (Créer une application « Zitoun » → Test interne → Importer le .aab). Les suivants peuvent partir par le workflow avec « publish » coché, une fois le compte de service `play-publisher` autorisé sur l'application Zitoun.

## Pour publier sur Google Play (plus tard)
Même chaîne que Kalam (voir `PUBLISHING.md` à la racine): clé d'envoi, workflow, première version à envoyer à la main. Avant la production: politique de confidentialité (l'application ne collecte rien, mais le message WhatsApp contient les informations de livraison du client) et déclaration « Sécurité des données ».
