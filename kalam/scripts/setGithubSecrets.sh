#!/usr/bin/env bash
# À lancer dans Cloud Shell APRÈS createUploadKey.sh et le déploiement Cloud Run.
# Usage: bash setGithubSecrets.sh [ID_DU_PROJET_GOOGLE_CLOUD]
# Fait tout en une fois: connexion à GitHub (vous validez dans le navigateur), création des secrets manquants
# (adresse du serveur, clé, mots de passe), construction du .aab signé, et téléchargement du .aab.
# Le mot de passe est lu sans affichage; il ne passe par aucun fichier ni aucun chat.
set -euo pipefail

REPO="faridchakour5-ux/test"
JKS="$HOME/kalam-upload.jks"
B64="$HOME/kalam-upload.jks.base64"
ALIAS="kalam"
PROJECT="${1:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-europe-west1}"

[ -f "$JKS" ] || { echo "Clé introuvable ($JKS): lancez d'abord createUploadKey.sh depuis le dossier personnel."; exit 1; }
[ -f "$B64" ] || base64 -w0 "$JKS" > "$B64"

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "Connexion à GitHub: suivez les instructions (code à saisir dans le navigateur, puis « Authorize »)."
  gh auth login -h github.com -p https -w
fi

# 1. Adresse du serveur (lue depuis Cloud Run, rien à copier)
URL="$(gcloud run services describe kalam-backend --region "$REGION" --project "$PROJECT" --format='value(status.url)' 2>/dev/null || true)"
if [ -n "$URL" ]; then
  printf '%s' "$URL" | gh secret set EXPO_PUBLIC_API_URL -R "$REPO"
else
  echo "Adresse du serveur introuvable: créez le secret EXPO_PUBLIC_API_URL à la main."
fi

# 2. Clé et mots de passe (le mot de passe est vérifié contre la clé avant d'être enregistré)
gh secret set KALAM_KEYSTORE_BASE64 -R "$REPO" < "$B64"
while true; do
  read -r -s -p "Mot de passe de la clé (rien ne s'affiche), puis Entrée: " P; echo
  if keytool -list -keystore "$JKS" -storepass "$P" -alias "$ALIAS" >/dev/null 2>&1; then break; fi
  echo "Ce mot de passe n'ouvre pas la clé. Réessayez."
done
printf '%s' "$P" | gh secret set KALAM_KEYSTORE_PASSWORD -R "$REPO"
printf '%s' "$P" | gh secret set KALAM_KEY_PASSWORD -R "$REPO"
unset P

echo; echo "Secrets présents:"; gh secret list -R "$REPO"
rm -f "$B64"

command -v cloudshell >/dev/null 2>&1 && { echo "Sauvegardez le fichier de clé (fenêtre de téléchargement):"; cloudshell download "$JKS" || true; }

read -r -p "Construire maintenant le .aab signé (15 à 20 minutes) ? [O/n] " GO
if [ "${GO:-O}" = "n" ] || [ "${GO:-O}" = "N" ]; then echo "Terminé. Lancez le workflow plus tard (Actions > Envoi sur Google Play)."; exit 0; fi

bash "$(dirname "$0")/buildAab.sh" 1
