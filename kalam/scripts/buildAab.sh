#!/usr/bin/env bash
# À lancer dans Cloud Shell (gh déjà connecté): construit le .aab signé via GitHub Actions, attend la fin, puis le télécharge.
# Usage: bash buildAab.sh [version_code]   (1 pour le tout premier envoi)
set -euo pipefail
REPO="faridchakour5-ux/test"
VC="${1:-1}"
gh workflow run play-release.yml -R "$REPO" -f version_code="$VC" -f track=internal -f publish=false -f status=draft
sleep 10
RUN="$(gh run list -R "$REPO" --workflow play-release.yml --event workflow_dispatch -L 1 --json databaseId -q '.[0].databaseId')"
echo "Construction en cours (15 à 20 minutes), suivi automatique… Suivi aussi sur: https://github.com/$REPO/actions/runs/$RUN"
if ! gh run watch "$RUN" -R "$REPO" --exit-status; then
  echo "La construction a échoué. Détail: gh run view $RUN -R $REPO --log-failed"; exit 1
fi
rm -rf "$HOME/aab"; mkdir -p "$HOME/aab"
gh run download "$RUN" -R "$REPO" -n kalam-aab-signe -D "$HOME/aab"
ls -l "$HOME/aab"
command -v cloudshell >/dev/null 2>&1 && cloudshell download "$HOME/aab/app-release.aab" || true
echo "Terminé: le .aab est dans $HOME/aab/app-release.aab"
