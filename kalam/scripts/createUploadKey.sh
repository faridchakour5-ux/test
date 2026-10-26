#!/usr/bin/env sh
# Crée VOTRE clé d'envoi pour Google Play (à lancer sur votre ordinateur, Java requis). Rien n'est envoyé nulle part.
# Usage: sh createUploadKey.sh
# Résultat dans le dossier courant:
#   kalam-upload.jks            la clé (À SAUVEGARDER en lieu sûr; ne jamais la mettre dans le dépôt)
#   kalam-upload.jks.base64     valeur du secret GitHub KALAM_KEYSTORE_BASE64 (à copier-coller puis supprimer)
set -eu
if [ -e kalam-upload.jks ]; then echo "kalam-upload.jks existe déjà: rien n'est écrasé."; exit 1; fi
command -v keytool >/dev/null 2>&1 || { echo "Java (keytool) est absent: installez un JDK d'abord."; exit 1; }
echo "keytool va vous demander un mot de passe (notez-le: c'est KALAM_KEYSTORE_PASSWORD, et aussi KALAM_KEY_PASSWORD si vous gardez le même)."
keytool -genkeypair -v -storetype PKCS12 -keystore kalam-upload.jks -alias kalam -keyalg RSA -keysize 2048 -validity 10000
base64 < kalam-upload.jks | tr -d '\n' > kalam-upload.jks.base64
cat <<'T'

Fait. Secrets GitHub à créer (Settings > Secrets and variables > Actions):
  KALAM_KEYSTORE_BASE64    = contenu de kalam-upload.jks.base64
  KALAM_KEYSTORE_PASSWORD  = le mot de passe choisi
  KALAM_KEY_ALIAS          = kalam
  KALAM_KEY_PASSWORD       = le mot de passe de la clé (le même si keytool ne l'a pas demandé séparément)
  KALAM_APP_ID, EXPO_PUBLIC_API_URL
Puis supprimez kalam-upload.jks.base64 et sauvegardez kalam-upload.jks ailleurs.
T
