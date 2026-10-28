# CI self-hosted + Renovate — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer les 4 workflows GitHub Actions du dépôt sur des runners self-hosted Docker locaux (2 réplicas) et automatiser les mises à jour de dépendances avec Renovate self-hosted (PR hebdo non-major auto-mergée si CI verte).

**Architecture:** Docker Compose (`self-hosted/`) lance 2 conteneurs runners éphémères (image officielle `actions-runner` + CLI Docker + deps navigateurs Playwright) et 1 conteneur Renovate en boucle quotidienne. Les workflows ciblent `[self-hosted, Linux, X64]` ; l'auto-merge natif GitHub est garanti par une protection de branche minimale documentée.

**Tech Stack:** Docker Desktop (Windows), Docker Compose v2, ghcr.io/actions/actions-runner, ghcr.io/renovatebot/renovate, GitHub Actions YAML, bash.

**Spec:** `docs/superpowers/specs/2026-10-28-self-hosted-ci-dependency-updates-design.md` (approuvé le 2026-10-28 — le plan argumente depuis la spec ; les exécuteurs lisent les deux).

## Global Constraints

- **Jamais de secret réel committé** : PATs/tokens uniquement dans `self-hosted/.env` (non committé) ; `.env.example` contient des placeholders.
- **Commits locaux seulement** — ne JAMAIS `git push` sur ce dépôt sans demande explicite du propriétaire (push sur `main` = déploiement Vercel prod).
- **Husky** : avant chaque `git commit`, préfixer le PATH avec Node (scoop) — bash : `export PATH="$HOME/scoop/shims:$PATH"`. Le hook exécute lint + type-check + tests (~2 min warm).
- **Commitlint conventional** : `chore(ci): ...` pour tous les commits de ce plan.
- **Labels runner : exactement `[self-hosted, Linux, X64]`** (défauts d'enregistrement).
- **Invariants d'auto-merge (ne jamais renommer ces jobs dans ci.yml sans mettre à jour la protection de branche) :** `Lint & Type Check`, `Test`, `Build`.
- **`upload-artifact@v4` exige des noms d'artifacts uniques par job de matrice** — suffixer avec `-${{ matrix.browser }}` dans e2e-tests.yml.
- **Versions épinglées** : déterminer au moment de l'exécution (métadonnées, pas de valeurs inventées) :
  - actions-runner : `curl -s https://api.github.com/repos/actions/runner/releases/latest | grep '"tag_name"'` → tag `v2.3XX.X` → image tag `2.3XX.X`.
  - renovate : `curl -s https://api.github.com/repos/renovatebot/renovate/releases/latest | grep '"tag_name"'` → tag `vNN.X.X` → image tag `NN.X.X`.
  - playwright : version résolue dans `pnpm-lock.yaml` (grep `@playwright/test@`, ex. `1.63.0`).

## Review Focus

1. **PAT invalide ou expiré** → l'entrypoint doit échouer vite et lisible (exit non-zéro, message sur stderr), pas de runner fantôme côté GitHub. *Pin : Task 1, étape de test shellcheck + essai de l'entrypoint sans PAT (doit sortir en erreur).* 
2. **Socket Docker inaccessible dans le conteneur** → le job `docker-build` échouerait avec « permission denied » ; un utilisateur s'attend à ce que le push GHCR fonctionne sans réglage. *Pin : Task 6, étape `docker compose exec runner-1 docker info` (vérification manuelle documentée).*
3. **Machine éteinte pendant un cron** → à la remontée, les runs `schedule` s'exécutent en rafale ; un utilisateur s'attend à un rattrapage borné, pas à une avalanche. *Pin : Task 2 (la `concurrency` des workflows) + section « Mode dégradé » du README (Task 6).*
4. **Check requis renommé par un futur refactor** → l'auto-merge se bloque silencieusement (le check nommé n'existe plus) ; un utilisateur s'attend à un signalement, pas à un silence. *Pin : Task 6, section « Invariants » du README.*
5. **PR de deps en conflit avec `main`** (deux merges successifs touchent `pnpm-lock.yaml`) → Renovate doit rebaser seul (défaut `config:recommended`) ; un utilisateur s'attend à ne pas rebase à la main. *Pin : Task 3, note dans le README « Opérations ».*

---

### Task 1: Image runner (Dockerfile + entrypoint éphémère)

**Files:**
- Create: `self-hosted/runner/Dockerfile`
- Create: `self-hosted/runner/entrypoint.sh`

**Interfaces:**
- Consumes: variables d'environnement `REPO_SLUG` (ex. `CatFoxVoyager/MermaidStudio`), `RUNNER_NAME` (ex. `mermaidstudio-runner-1`), `RUNNER_PAT` (fine-grained PAT, permission Administration read/write sur le dépôt) — fournies par le compose de la Task 2.
- Produces: image `mermaidstudio-gh-runner:local`, exécutable dans un conteneur dont `/var/run/docker.sock` est monté ; l'entrypoint s'enregistre, exécute exactement un job, se désenregistre.

- [ ] **Step 1: Déterminer le pin de version** — suivre Global Constraints (releases actions/runner). Substituer dans le Dockerfile ci-dessous.

- [ ] **Step 2: Écrire `self-hosted/runner/Dockerfile`**

```dockerfile
# Self-hosted GitHub Actions runner pour MermaidStudio.
# Le tag suit la release courante de actions/runner (renovate manager: dockerfile).
FROM ghcr.io/actions/actions-runner:2.3XX.X

# Aligné avec @playwright/test de package.json — le regexManager Renovate
# (renovate.json, Task 3) mettra à jour ce ARG quand le repo bump playwright.
ARG PLAYWRIGHT_VERSION=1.63.0

USER root
# docker.io: CLI Docker pour le job docker-build (push GHCR) via le socket monté.
# jq: extraction du registration token. qemu-user-static: builds arm64 (multi-arch).
RUN apt-get update \
 && apt-get install -y --no-install-recommends docker.io jq curl qemu-user-static \
 && rm -rf /var/lib/apt/lists/*
# Dépendances système des navigateurs Playwright (chromium, firefox, webkit).
RUN npx -y playwright@${PLAYWRIGHT_VERSION} install-deps chromium firefox webkit

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
USER runner
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
```

- [ ] **Step 3: Écrire `self-hosted/runner/entrypoint.sh`** — contrat : échoue non-zéro si une des 3 variables manque ou si l'API refuse le token ; s'enregistre avec `--replace --ephemeral`, labels `self-hosted,Linux,X64` ; au nettoyage (EXIT), retire l'enregistrement best-effort avec un remove-token frais.

```bash
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
```

- [ ] **Step 4: Vérifier** — `bash -n self-hosted/runner/entrypoint.sh` (syntaxe OK, sortie vide) ; `docker build -t mermaidstudio-gh-runner:local self-hosted/runner` (build complet OK) ; sans `RUNNER_PAT` : `docker run --rm mermaidstudio-gh-runner:local` → sort en erreur « RUNNER_PAT manquant ».

- [ ] **Step 5: Commit**

```bash
export PATH="$HOME/scoop/shims:$PATH"
git add self-hosted/runner/
git commit -m "chore(ci): add self-hosted ephemeral runner image"
```

### Task 2: Stack Compose (runners ×2 + Renovate) et .env.example

**Files:**
- Create: `self-hosted/docker-compose.yml`
- Create: `self-hosted/.env.example`

**Interfaces:**
- Consumes: image `mermaidstudio-gh-runner:local` (Task 1), service Renovate configuré par `./renovate/config.js` (Task 3).
- Produces: services nommés `runner-1`, `runner-2`, `renovate` ; volumes `runner1-home`, `runner2-home`, `renovate-cache`.

- [ ] **Step 1: Déterminer le pin Renovate** — suivre Global Constraints.

- [ ] **Step 2: Écrire `self-hosted/.env.example`** — placeholders uniquement, jamais de valeurs réelles :

```
REPO_SLUG=CatFoxVoyager/MermaidStudio
RUNNER_PAT=github_pat_RUNNER_here   # fine-grained: Administration (RW) sur ce dépôt
RENOVATE_TOKEN=github_pat_RENOVATE_here  # fine-grained: Contents RW, Pull requests RW, Workflows RW, Metadata R
```

- [ ] **Step 3: Écrire `self-hosted/docker-compose.yml`**

```yaml
name: mermaidstudio-ci

services:
  runner-1:
    build: ./runner
    image: mermaidstudio-gh-runner:local
    restart: unless-stopped
    env_file: .env
    environment:
      RUNNER_NAME: mermaidstudio-runner-1
    volumes:
      - runner1-home:/home/runner
      - /var/run/docker.sock:/var/run/docker.sock

  runner-2:
    image: mermaidstudio-gh-runner:local
    restart: unless-stopped
    env_file: .env
    environment:
      RUNNER_NAME: mermaidstudio-runner-2
    volumes:
      - runner2-home:/home/runner
      - /var/run/docker.sock:/var/run/docker.sock

  renovate:
    image: ghcr.io/renovatebot/renovate:NN.X.X
    restart: unless-stopped
    env_file: .env
    environment:
      LOG_LEVEL: info
    entrypoint: ["/bin/sh", "-c", "while :; do renovate; sleep 86400; done"]
    volumes:
      - ./renovate/config.js:/usr/src/app/config.js:ro
      - renovate-cache:/tmp/renovate

volumes:
  runner1-home:
  runner2-home:
  renovate-cache:
```

(`runner-2` sans `build:` — la même image locale ; `runner-1` la reconstruit.)

- [ ] **Step 4: Vérifier** — le service `env_file: .env` exige un fichier présent :
  créer temporairement `self-hosted/.env` avec les placeholders de `.env.example`,
  puis `cd self-hosted && docker compose config --quiet` (exit 0, aucune erreur)
  et supprimer le `.env` de test (le vrai `.gitignore` est ajouté en Task 5).

- [ ] **Step 5: Commit**

```bash
export PATH="$HOME/scoop/shims:$PATH"
git add self-hosted/docker-compose.yml self-hosted/.env.example
git commit -m "chore(ci): add compose stack for runners and renovate"
```

### Task 3: Configurations Renovate (self-hosted + dépôt)

**Files:**
- Create: `self-hosted/renovate/config.js`
- Create: `renovate.json`

**Interfaces:**
- Consumes: `RENOVATE_TOKEN` (env du service, Task 2).
- Produces: `renovate.json` validé — le schema attendu par le conteneur Renovate.

- [ ] **Step 1: Écrire `self-hosted/renovate/config.js`**

```js
// Config Renovate self-hosted — la config par-repo vit dans renovate.json (racine).
module.exports = {
  platform: 'github',
  endpoint: 'https://api.github.com/',
  token: process.env.RENOVATE_TOKEN,
  repositories: ['CatFoxVoyager/MermaidStudio'],
  onboarding: false,          // la config du dépôt est committée
  requireConfig: 'optional',
  prCreation: 'immediate',
  persistRepoData: true,      // cache du clone dans le volume renovate-cache
  logLevel: process.env.LOG_LEVEL || 'info',
  // Commits attribués au propriétaire (PAT de son compte — décision design §6).
  // Récupérer l'ID numérique via GET /users/CatFoxVoyager, puis décommenter :
  // gitAuthor: 'CatFoxVoyager <ID+CatFoxVoyager@users.noreply.github.com>',
};
```

- [ ] **Step 2: Écrire `renovate.json`** — valeurs exactes de la spec (§ Composant Renovate + § Politique infra) :

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "timezone": "Europe/Paris",
  "schedule": ["before 7am on monday"],
  "labels": ["dependencies"],
  "rangeStrategy": "bump",
  "packageRules": [
    {
      "description": "npm non-major groupé — auto-merge si CI verte",
      "matchManagers": ["npm"],
      "matchUpdateTypes": ["patch", "minor", "pin", "pinDigest", "digest"],
      "groupName": "chore(deps): non-major updates",
      "automerge": true,
      "platformAutomerge": true
    },
    {
      "description": "npm major — PRs séparées, revue manuelle",
      "matchManagers": ["npm"],
      "matchUpdateTypes": ["major"],
      "automerge": false
    },
    {
      "description": "GitHub Actions groupées — auto-merge si CI verte",
      "matchManagers": ["github-actions"],
      "groupName": "chore(ci): github-actions updates",
      "automerge": true,
      "platformAutomerge": true
    },
    {
      "description": "Images infra self-hosted — revue manuelle (rebuild au boot)",
      "matchManagers": ["dockerfile", "docker-compose"],
      "groupName": "chore(ci): self-hosted infra images",
      "automerge": false
    },
    {
      "description": "Lockfile maintenance hebdo — auto-merge si CI verte",
      "matchDepTypes": ["lockFileMaintenance"],
      "enabled": true,
      "automerge": true,
      "platformAutomerge": true
    }
  ],
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["before 7am on monday"]
  },
  "vulnerabilityAlerts": {
    "labels": ["security"]
  },
  "customManagers": [
    {
      "customType": "regex",
      "description": "Aligne ARG PLAYWRIGHT_VERSION du Dockerfile runner avec la version npm courante",
      "fileMatch": ["self-hosted/runner/Dockerfile"],
      "matchStrings": ["ARG PLAYWRIGHT_VERSION=(?<currentValue>\\S+)"],
      "depNameTemplate": "playwright",
      "datasourceTemplate": "npm"
    }
  ]
}
```

> Note (compromis assumé, design § Composant runner) : le regexManager suit la
> dernière version npm de `playwright`, pas la valeur de `@playwright/test` du
> `package.json`. Si les deux divergent, `playwright install-deps` installe des
> deps système dont l'ensemble est compatible avec les versions récentes — le
> step `playwright install --with-deps` du workflow télécharge, lui, la version
> exacte du repo depuis son propre lockfile.

- [ ] **Step 3: Vérifier** — `python -c "import json;json.load(open('renovate.json'))"` (parse OK) ; validation schema officielle :
  `docker run --rm -v "./renovate.json:/usr/src/app/config.json:ro" ghcr.io/renovatebot/renovate:NN.X.X renovate-config-validator` → « Config valid » (ou équivalent ; échec = corriger).

- [ ] **Step 4: Commit**

```bash
export PATH="$HOME/scoop/shims:$PATH"
git add self-hosted/renovate/config.js renovate.json
git commit -m "chore(deps): add renovate configuration (repo + self-hosted)"
```

### Task 4: Adaptation de `ci.yml`

**Files:**
- Modify: `.github/workflows/ci.yml` (10 `runs-on`, job `test`, job `docker-build`, artifacts, `concurrency`)

**Interfaces:**
- Produces: checks nommés exactement `Lint & Type Check`, `Test`, `Build` sur les PRs vers `main` (invariants d'auto-merge — Global Constraints).

- [ ] **Step 1: `runs-on`** — remplacer les 10 occurrences de `runs-on: ubuntu-latest` par `runs-on: [self-hosted, Linux, X64]`.

- [ ] **Step 2: Concurrency** — ajouter au niveau racine du workflow (après `on:`) :

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

- [ ] **Step 3: Job `test` bloquant** — dans le job `test`/step « Run tests » : retirer `continue-on-error: true`, mettre à jour le commentaire du step : la suite est bloquante pour l'auto-merge (décision design #5) ; la couverture reste advisory via Codecov ; garder `NODE_OPTIONS: --max-old-space-size=4096`.

- [ ] **Step 4: Artifacts v3 → v4** — `actions/upload-artifact@v3` → `@v4` (jobs `docs`, `build`) ; `actions/download-artifact@v3` → `@v4` (jobs `deploy-docs`, `deploy-staging`, `deploy-production`). Pas de matrice dans ce workflow : noms inchangés (`docs-files`, `dist-files`).

- [ ] **Step 5: QEMU pour le multi-arch** — dans le job `docker-build`, ajouter AVANT `docker/setup-buildx-action@v3` (sur un conteneur runner, qemu-user-static n'est pas préinstallé dans la VM Docker comme sur les runners GitHub-hosted) :

```yaml
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
```

- [ ] **Step 6: Vérifier** — lint YAML + workflow :
  `docker run --rm -v "$(pwd):/repo" -w /repo rhysd/actionlint:latest -color` → aucune erreur (les autres workflows peuvent encore signaler des erreurs connues jusqu'à la Task 5 — n'accepter que zéro erreur relative à ci.yml).

- [ ] **Step 7: Commit**

```bash
export PATH="$HOME/scoop/shims:$PATH"
git add .github/workflows/ci.yml
git commit -m "chore(ci): route ci.yml to self-hosted runners, block on tests"
```

### Task 5: Adaptation de `e2e-tests.yml`, `docs.yml`, `dependency-audit.yml` + .gitignore

**Files:**
- Modify: `.github/workflows/e2e-tests.yml` (3 `runs-on`, artifacts en matrice, `concurrency`)
- Modify: `.github/workflows/docs.yml` (4 `runs-on`, artifact, `concurrency`)
- Modify: `.github/workflows/dependency-audit.yml` (1 `runs-on`)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: mêmes conventions que Task 4 (`runs-on`, `concurrency`).

- [ ] **Step 1: `.gitignore`** — ajouter `self-hosted/.env` (une ligne ; vérifier avec `git check-ignore self-hosted/.env`).

- [ ] **Step 2: `e2e-tests.yml`** — `runs-on` ×3 → `[self-hosted, Linux, X64]` ; bloc `concurrency` identique à la Task 4 ; renommer les artifacts en matrice (v4 exige l'unicité) :
  - `name: playwright-results` → `playwright-results-${{ matrix.browser }}`
  - `name: playwright-screenshots` → `playwright-screenshots-${{ matrix.browser }}`
  - `name: playwright-videos` → `playwright-videos-${{ matrix.browser }}`
  - `actions/upload-artifact@v3` → `@v4` (3 occurrences).
  Ne pas toucher aux `continue-on-error` (E2E reste advisory — design #5).

- [ ] **Step 3: `docs.yml`** — `runs-on` ×4 ; bloc `concurrency` identique ; `actions/upload-artifact@v3` → `@v4` (`docs-report`, pas de matrice : nom inchangé).

- [ ] **Step 4: `dependency-audit.yml`** — `runs-on` ×1. Pas d'artifact à renommer (l'upload `dependency-audit-results` est déjà v4).

- [ ] **Step 5: Vérifier** — `docker run --rm -v "$(pwd):/repo" -w /repo rhysd/actionlint:latest -color` → zéro erreur sur l'ensemble des 4 workflows.

- [ ] **Step 6: Commit**

```bash
export PATH="$HOME/scoop/shims:$PATH"
git add .github/workflows/e2e-tests.yml .github/workflows/docs.yml .github/workflows/dependency-audit.yml .gitignore
git commit -m "chore(ci): route remaining workflows to self-hosted runners"
```

### Task 6: README d'activation et d'opérations + dry-run Renovate

**Files:**
- Create: `self-hosted/README.md`

**Interfaces:**
- Consumes: tout ce qui précède ; documente l'activation manuelle du propriétaire (design § Ce qui reste à l'utilisateur).

- [ ] **Step 1: Écrire `self-hosted/README.md`** — sections exactes suivantes :
  1. **Arrêt d'urgence** en tête : `docker compose -f self-hosted/docker-compose.yml stop`.
  2. **Activation** (pas-à-pas, liens exacts) :
     - PAT 1 `RUNNER_PAT` : Settings → Developer settings → Fine-grained tokens → ce seul dépôt → **Administration: Read and write** ;
     - PAT 2 `RENOVATE_TOKEN` : même chemin → **Contents: RW, Pull requests: RW, Workflows: RW, Metadata: R** ; expiration ≤ 1 an ;
     - `cp self-hosted/.env.example self-hosted/.env` + renseigner ;
     - `docker compose -f self-hosted/docker-compose.yml up -d --build` ;
     - Settings → General → Pull Requests → **Allow auto-merge** ;
     - Settings → Branches → protection de `main` : *Require status checks to pass* → cocher exactement `Lint & Type Check`, `Test`, `Build` ; NE PAS cocher *Require approvals* ni *Require branches to be up to date* (design § Mécanisme d'auto-merge) ; NE PAS cocher *Include administrators* ;
     - vérifier les 2 runners verts dans Settings → Actions → Runners.
  3. **Opérations** : premier run Renovate = `RENOVATE_DRY_RUN=full` (voir Task 6 Step 2) ; `docker compose logs -f renovate` ; conflits de lockfile → Renovate rebasse seul (Review Focus 5) ; mise à jour des images infra : Renovate propose la PR, après merge lancer `docker compose build` au prochain boot.
  4. **Invariants** (Review Focus 4) : ne jamais renommer les checks `Lint & Type Check` / `Test` / `Build` dans ci.yml sans mettre à jour la protection de branche — sinon auto-merge bloqué en silence ; verifier l'onglet Checks d'une PR Renovate pour confirmer.
  5. **Mode dégradé** (Review Focus 3) : machine éteinte → ratchat des crons au boot, borné par la `concurrency`.
  6. **Dépannage** : socket Docker refusé dans le conteneur (`docker compose exec runner-1 docker info` → permission denied : Docker Desktop → Settings → Resources → vérifier le partage, ou ajouter `group_add: ["999"]` au service) ; cache buildx `type=gha` en échec → basculer `cache-from/cache-to` sur `type=local` avec un volume dédié ; PAT expiré → symptôme : conteneur runner en boucle d'erreur « Bad credentials », renouveler et `docker compose up -d --force-recreate`.
  7. **Sécurité** (design § Sécurité) : secrets du dépôt injectés dans les jobs locaux (trade-off mono-utilisateur assumé) ; ne jamais passer « Fork pull request workflows: automatically run » ; kill-switch en tête.
  8. **Renouvellement PATs** : rappel ~9 mois (expiration max 1 an).

- [ ] **Step 2: Dry-run Renovate local** (vérification finale hors activation) — avec un `.env` réel renseigné par le propriétaire OU en lui demandant ses tokens si disponible :

```bash
cd self-hosted
docker run --rm --env-file .env -e RENOVATE_DRY_RUN=full \
  -v "./renovate/config.js:/usr/src/app/config.js:ro" \
  ghcr.io/renovatebot/renovate:NN.X.X renovate
```

Attendu : logs Renovate « Dry run » / découverte du dépôt, aucune PR créée. Si le token n'est pas encore disponible, laisser cette étape en checklist au propriétaire (elle figure dans le README).

- [ ] **Step 3: Commit**

```bash
export PATH="$HOME/scoop/shims:$PATH"
git add self-hosted/README.md
git commit -m "docs(ci): self-hosted runner and renovate activation guide"
```

---

## Après le plan (hors périmètre des tasks — activation)

Les étapes d'activation du design (2 PATs, settings GitHub, `up -d --build`, test du `workflow_dispatch` de `dependency-audit.yml` sur le runner local) sont documentées dans `self-hosted/README.md` et restent à la main du propriétaire — elles demandent ses identifiants GitHub et son Docker Desktop.
