#!/usr/bin/env bash
# À lancer dans Cloud Shell (gh connecté): construit un APK signé à installer DIRECTEMENT sur un téléphone Android
# (essai seulement: ce fichier ne sert pas à publier sur Google Play), l'attend puis le télécharge.
# Usage: bash buildApk.sh [version_code]
set -euo pipefail
REPO="faridchakour5-ux/test"
VC="${1:-1}"
gh workflow run play-release.yml -R "$REPO" -f version_code="$VC" -f track=internal -f publish=false -f apk=true -f status=draft
sleep 10
RUN="$(gh run list -R "$REPO" --workflow play-release.yml --event workflow_dispatch -L 1 --json databaseId -q '.[0].databaseId')"
echo "Construction en cours (20 à 25 minutes): https://github.com/$REPO/actions/runs/$RUN"
gh run watch "$RUN" -R "$REPO" --exit-status || { echo "Échec: gh run view $RUN -R $REPO --log-failed"; exit 1; }
rm -rf "$HOME/apk"; mkdir -p "$HOME/apk"
gh run download "$RUN" -R "$REPO" -n kalam-apk-signe -D "$HOME/apk"
ls -l "$HOME/apk"
command -v cloudshell >/dev/null 2>&1 && cloudshell download "$HOME/apk/app-release.apk" || true
