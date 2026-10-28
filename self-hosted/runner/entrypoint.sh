#!/usr/bin/env bash
# Éphémère : s'enregistre, exécute UN job, se désenregistre.
# restart: unless-stopped du compose relance le conteneur après chaque job.
set -euo pipefail

: "${REPO_SLUG:?REPO_SLUG manquant (ex. CatFoxVoyager/MermaidStudio)}"
: "${RUNNER_NAME:?RUNNER_NAME manquant}"
: "${RUNNER_PAT:?RUNNER_PAT manquant}"

api() { curl -fsSL -X POST -H "Authorization: Bearer ${RUNNER_PAT}" \
  -H "Accept: application/vnd.github+json" "https://api.github.com/repos/${REPO_SLUG}/${1}"; }

cleanup() {
  # Best-effort : rien à retirer si le mode éphémère s'est déjà désenregistré.
  rt=$(api actions/runners/remove-token | jq -r .token) || return 0
  ./config.sh remove --token "$rt" --unattended || true
}
trap cleanup EXIT

echo "Registration de ${RUNNER_NAME} sur ${REPO_SLUG}..."
token=$(api actions/runners/registration-token | jq -r .token)
[ -n "$token" ] && [ "$token" != "null" ] || { echo "registration-token vide : PAT invalide ?" >&2; exit 1; }

./config.sh --url "https://github.com/${REPO_SLUG}" --token "$token" \
  --name "${RUNNER_NAME}" --labels "self-hosted,Linux,X64" \
  --ephemeral --unattended --replace

./run.sh
