#!/usr/bin/env bash
# Déploie le serveur Kalam sur Google Cloud Run. À lancer dans Cloud Shell (ou un terminal où gcloud est connecté),
# depuis le dossier backend/. Usage: bash deploy-cloudrun.sh ID_DU_PROJET
# La clé d'API Anthropic est demandée ICI, sans affichage, et va directement dans Secret Manager:
# elle ne passe ni par un fichier, ni par l'historique du terminal, ni par un chat.
set -euo pipefail
# Les questions de gcloud (ex. créer le dépôt d'images) reçoivent la réponse par défaut « oui »: rien à taper.
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

PROJECT="${1:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-europe-west1}"
SERVICE="kalam-backend"
SECRET="anthropic-api-key"
[ -n "$PROJECT" ] || { echo "Usage: bash deploy-cloudrun.sh ID_DU_PROJET (ex. kalam-123456)"; exit 1; }
[ -f Dockerfile ] || { echo "Lancez ce script depuis le dossier backend/ (cd backend)."; exit 1; }

gcloud config set project "$PROJECT"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com

if ! gcloud secrets describe "$SECRET" >/dev/null 2>&1; then
  read -r -s -p "Collez votre clé d'API Anthropic (rien ne s'affiche), puis Entrée: " KEY; echo
  [ -n "$KEY" ] || { echo "Clé vide: arrêt."; exit 1; }
  printf '%s' "$KEY" | gcloud secrets create "$SECRET" --replication-policy=automatic --data-file=-
  unset KEY
else
  echo "Le secret $SECRET existe déjà: il est réutilisé."
fi

PN="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
SA="${PN}-compute@developer.gserviceaccount.com"
# Le serveur lit la clé; la construction de l'image a besoin du rôle Cloud Build.
gcloud secrets add-iam-policy-binding "$SECRET" --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="roles/cloudbuild.builds.builder" >/dev/null

# Une seule copie du serveur: la limite de requêtes est gardée en mémoire.
gcloud run deploy "$SERVICE" --source . --region "$REGION" --allow-unauthenticated --max-instances 1 \
  --set-env-vars "TRUST_PROXY=1,DAILY_REQUEST_LIMIT=1000,PER_CLIENT_DAILY_LIMIT=200,HISTORY_FOR_AI=10,KALAM_MODEL=claude-haiku-5-5" \
  --set-secrets "ANTHROPIC_API_KEY=${SECRET}:latest"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo
echo "Adresse du serveur (secret GitHub EXPO_PUBLIC_API_URL): $URL"
echo -n "Test /health: "; curl -fsS "$URL/health" || echo "pas de réponse (voir les journaux dans la console Cloud Run)"
echo
