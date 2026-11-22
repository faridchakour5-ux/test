#!/usr/bin/env bash
# À lancer dans Cloud Shell (gh connecté à GitHub): construit l'APK d'essai de Zitoun, l'attend, puis le télécharge.
# Usage: bash buildApk.sh [numéro WhatsApp du vendeur]   (déjà enregistré dans le secret ZITOUN_SELLER_WHATSAPP si omis)
set -euo pipefail
REPO="faridchakour5-ux/test"
if [ -n "${1:-}" ]; then
  digits="$(printf '%s' "$1" | tr -d ' +().-')"
  case "$digits" in (*[!0-9]*|'') echo "Numéro invalide: chiffres seulement, indicatif compris (ex. 212612345678)."; exit 1;; esac
  printf '%s' "$digits" | gh secret set ZITOUN_SELLER_WHATSAPP -R "$REPO"
fi
gh workflow run zitoun-apk.yml -R "$REPO"
sleep 10
RUN="$(gh run list -R "$REPO" --workflow zitoun-apk.yml --event workflow_dispatch -L 1 --json databaseId -q '.[0].databaseId')"
echo "Construction en cours (15 à 20 minutes): https://github.com/$REPO/actions/runs/$RUN"
gh run watch "$RUN" -R "$REPO" --exit-status || { echo "Échec: gh run view $RUN -R $REPO --log-failed"; exit 1; }
rm -rf "$HOME/zitoun-apk"; mkdir -p "$HOME/zitoun-apk"
gh run download "$RUN" -R "$REPO" -n zitoun-apk -D "$HOME/zitoun-apk"
ls -l "$HOME/zitoun-apk"
command -v cloudshell >/dev/null 2>&1 && cloudshell download "$HOME/zitoun-apk/app-release.apk" || true
