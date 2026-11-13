#!/usr/bin/env bash
# À lancer dans Cloud Shell (gcloud et gh connectés). Prépare l'accès automatique à Google Play:
# crée un compte de service « play-publisher », sa clé, et enregistre la clé directement dans le secret GitHub
# PLAY_SERVICE_ACCOUNT_JSON (le fichier est supprimé aussitôt: il ne passe ni par un chat, ni par votre PC).
# Il reste UNE étape à la main dans la Play Console: inviter l'adresse affichée (voir la fin du script).
# Usage: bash setupPlayAccess.sh [ID_DU_PROJET_GOOGLE_CLOUD]
set -euo pipefail
REPO="faridchakour5-ux/test"
PROJECT="${1:-$(gcloud config get-value project 2>/dev/null || true)}"
[ -n "$PROJECT" ] || { echo "Usage: bash setupPlayAccess.sh ID_DU_PROJET"; exit 1; }
NAME="play-publisher"
EMAIL="${NAME}@${PROJECT}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT" >/dev/null
gcloud services enable androidpublisher.googleapis.com iam.googleapis.com
if ! gcloud iam service-accounts describe "$EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$NAME" --display-name="Kalam: publication Google Play"
fi
KEYFILE="$(mktemp)"
trap 'shred -u "$KEYFILE" 2>/dev/null || rm -f "$KEYFILE"' EXIT
gcloud iam service-accounts keys create "$KEYFILE" --iam-account="$EMAIL"
gh secret set PLAY_SERVICE_ACCOUNT_JSON -R "$REPO" < "$KEYFILE"
echo
echo "Secret PLAY_SERVICE_ACCOUNT_JSON enregistré dans GitHub. Le fichier de clé est supprimé."
echo
echo "DERNIÈRE ÉTAPE (à la main, dans la Play Console):"
echo "  Utilisateurs et autorisations > Inviter de nouveaux utilisateurs"
echo "  Adresse e-mail: $EMAIL"
echo "  Autorisations de l'application Kalam: « Publier des versions » (gestion des versions); rien d'autre."
echo "  Cliquer « Inviter l'utilisateur », puis « Envoyer l'invitation »."
