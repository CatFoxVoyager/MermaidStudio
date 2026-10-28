# Design — CI self-hosted (runners Docker locaux) + mises à jour de dépendances Renovate

**Date :** 2026-10-28
**Statut :** proposition — en attente d'approbation
**Dépôt :** `CatFoxVoyager/MermaidStudio` (public)
**Machine hôte :** Windows 11 Pro, Docker Desktop, machine toujours allumée

## Intent et pourquoi

Les quotas de minutes GitHub Actions sont régulièrement dépassés. La machine locale
est toujours allumée avec Docker : toute la CI est migrée sur des runners GitHub
Actions **self-hosted en conteneurs Docker** (coût marginal nul, minutes GitHub ~0),
et les mises à jour de dépendances sont automatisées par **Renovate self-hosted**
(conteneur cron) avec auto-merge des mises à jour non-major quand la CI est verte.

## Décisions déjà prises (par le propriétaire)

1. **Portée : toute la CI** — `ci.yml`, `e2e-tests.yml`, `docs.yml`,
   `dependency-audit.yml` tournent sur le runner local.
2. **Outil de mise à jour des dépendances : Renovate self-hosted** (pas Dependabot,
   pas de workflow pnpm custom).
3. **Fusion : auto-merge des PRs non-major si la CI est verte.** Conséquence assumée
   et tracée : chaque fusion déclenche un déploiement Vercel production
   (push sur `main` = déploiement prod sur ce dépôt).
4. **Mécanisme d'auto-merge (décision du 2026-10-28, post-revue design) :**
   protection de branche minimale sur `main` (checks requis) + auto-merge natif
   GitHub — voir la section « Mécanisme d'auto-merge ».
5. **Tests unitaires bloquants** : le `continue-on-error` du job `Test` de `ci.yml`
   est retiré — un échec de tests bloque l'auto-merge. L'E2E reste advisory
   (flakiness multi-navigateurs documentée dans le workflow).
6. **Token Renovate porté par le compte du propriétaire** (`CatFoxVoyager`) — pas de
   compte bot dédié ; valable tant qu'aucune review n'est exigée sur les PRs.
7. **Capacité : 2 réplicas runner.** Machine cible ≥ 8 cœurs / 16 Go RAM ; ajustable
   dans le compose. Rétention des artifacts inchangée (30 jours).

## Goals

- Zéro minute GitHub consommée par les workflows du dépôt (les runners GitHub-hosted
  ne sont plus le chemin nominal).
- Une **PR hebdomadaire groupée** « non-major » de dépendances, auto-fusionnée quand
  lint/type-check/build/E2E passent ; les **majors en PRs séparées** avec revue manuelle.
- Infrastructure locale **reproductible et versionnée dans le dépôt**
  (`self-hosted/`), secrets uniquement dans un `.env` local non committé.
- Document d'activation pas-à-pas (PATs, settings GitHub, démarrage, arrêt d'urgence).

## Non-goals

- Pas d'orchestrateur k8s / actions-runner-controller — plain Docker Compose.
- Pas de bascule ARM pour les builds locaux : le job Docker GHCR garde son
  multi-arch `linux/amd64,linux/arm64` via QEMU (buildx le télécharge au job).
- Pas de refonte des workflows au-delà de ce qui est nécessaire (runs-on,
  concurrency, artefacts).
- Pas de runner pour les dépôts privés (`MermaidStudio-App`) — extension future.

## Anti-goals (échecs inacceptables même si ça « marche »)

- Aucun bot ne pousse directement sur `main` hors du mécanisme de PR + auto-merge.
- Aucun secret (PAT, token) committé dans le dépôt, y compris dans le design.
- Le runner local ne doit jamais exécuter du code de PR de fork extérieur sans
  approbation humaine (défaut GitHub conservé — voir Sécurité).

## Contraintes

- **Dépôt public** : un self-hosted runner exécute du code fourni par le dépôt ;
  les PRs de forks extérieurs déclenchent des workflows → durcissement obligatoire.
- **pnpm 10 + tarball vendored** (`file:vendor/mlc-ai-web-llm-0.2.83.tgz`) :
  Renovate ignore naturellement les deps `file:` ; le lockfile reste `pnpm-lock.yaml`.
- **Node `^24`, engines npm ≥ 10** ; tests Vitest (suite ~2 min warm), E2E Playwright
  1.63 sur chromium/firefox/webkit (+ matrix cross-browser edge/chrome).
- **Commitlint conventional commits** — Renovate produit déjà `chore(deps): ...`.
- **Windows Docker Desktop** : les conteneurs sont Linux ; `/var/run/docker.sock`
  est montable dans les conteneurs via le proxy Docker Desktop.
- Le checkout local de travail est en français pour les échanges ; code et configs
  en anglais.

## Architecture

### Arborescence ajoutée au dépôt

```
self-hosted/
├── docker-compose.yml          # runner-1, runner-2, renovate
├── .env.example                # variables attendues (jamais de valeurs réelles)
├── README.md                   # activation pas-à-pas + opérations + arrêt d'urgence
├── runner/
│   ├── Dockerfile              # FROM ghcr.io/actions/actions-runner:<pin>
│   └── entrypoint.sh           # enregistrement éphémère, run, désenregistrement
└── renovate/
    └── config.js               # config self-hosted (token via env)
renovate.json                   # config partagée du dépôt (racine, convention Renovate)
```

### Composant runner (2 réplicas)

- **Image de base** : `ghcr.io/actions/actions-runner` (tag épinglé à la version
  courante au moment de l'implémentation). L'image officielle embarque le runner,
  git, et l'utilisateur `runner` avec sudo sans mot de passe.
- **Dockerfile** ajoute : `docker.io` CLI + `jq` + les **dépendances système des 3
  navigateurs Playwright** (via `npx -y playwright@<même version que le repo>
  install-deps chromium firefox webkit`). Un **regexManager Renovate** gardera la
  version Playwright du Dockerfile alignée avec `@playwright/test` du `package.json`.
- **Entrypoint éphémère** (`RUNNER_EPHEMERAL`/`--ephemeral`) :
  1. échange le PAT (`RUNNER_PAT`) contre un registration-token via l'API GitHub
     (`POST /repos/{owner}/{repo}/actions/runners/registration-token`) ;
  2. `config.sh --replace ... --ephemeral --unattended` (le `--replace` neutralise
     un enregistrement fantôme du même nom) ;
  3. `run.sh` — le runner prend **un job** puis se désenregistre ;
  4. sur SIGTERM/SIGINT (et après le job) : `config.sh remove` avec un token frais ;
  5. le conteneur sort, `restart: unless-stopped` le relance → re-registration.
  Résultat : aucun état persistant côté serveur, un runner mort ne se cumule pas.
- **Volumes** : un volume nommé par runner monté sur `/home/runner` (pré-rempli par
  l'image au premier montage) → persistent : cache d'outils Node (`_work/_tool`),
  store pnpm, cache `~/.cache/ms-playwright`, plugin buildx.
- **Socket Docker** : `/var/run/docker.sock` monté dans chaque runner pour que le
  job `docker-build` de `ci.yml` (push GHCR) fonctionne. L'action
  `docker/setup-buildx-action` installe le plugin buildx dans le home persistant.
  Cache buildx : conserver `type=gha` (fonctionne depuis les runners récents) ;
  fallback documenté vers `type=local` sur un volume si le cache GHA échoue.
- **Labels** : les labels par défaut de l'enregistrement — `[self-hosted, Linux, X64]`.
  Tous les workflows ciblent exactement ça.

### Composant Renovate

- **Conteneur** : `ghcr.io/renovatebot/renovate` (version épinglée), volume de cache
  (`persistRepoData: true`) pour des runs lents puis rapides.
- **Cadence** : boucle d'entrypoint — un run Renovate au démarrage puis toutes les
  24 h ; la fenêtre réelle de création/fusion est pilotée par `schedule` dans
  `renovate.json` (le lundi avant 07 h, America/New_York — fuseau du
  propriétaire, corrigé le 2026-10-28 ; supposait Europe/Paris à tort). Si la machine était éteinte,
  le run du boot rattrape.
- **`self-hosted/renovate/config.js`** : `platform: 'github'`, token via
  `RENOVATE_TOKEN`, `repositories: ['CatFoxVoyager/MermaidStudio']`,
  `onboarding: false` (la config du dépôt est committée), `requireConfig: 'optional'`,
  `prCreation: 'immediate'`.
- **`renovate.json`** (racine du dépôt) :
  - `extends: ["config:recommended"]`, `timezone: "America/New_York"`,
    `schedule: ["before 7am on monday"]`, labels `dependencies`.
  - **PackageRules** :
    1. npm non-major (`patch`, `minor`, `pin`, `digest`) → **une seule PR groupée**
       `chore(deps): non-major updates`, `automerge: true` + `platformAutomerge: true`
       (auto-merge native GitHub → attend la CI verte).
    2. npm **major** → PRs séparées, `automerge: false` (revue manuelle).
    3. GitHub Actions (`matchManagers: ["github-actions"]`) → groupe unique
       `chore(ci)`, auto-merge activé.
    4. `lockFileMaintenance` hebdo, auto-merge.
  - `vulnerabilityAlerts` activés (labels `security`) — les PRs de fix de
    vulnérabilité suivent la règle 1 (non-major) ou 2 (major).
- Le template `.github/pull_request_template_dependency_update.md` existant est un
  vestige (les PRs créées par API n'héritent pas des templates) : conservé tel quel,
  aucun couplage.

### Adaptation des workflows (4 fichiers)

- `runs-on: ubuntu-latest` → `runs-on: [self-hosted, Linux, X64]` (18 occurrences :
  ci.yml 10, e2e-tests.yml 3, docs.yml 4, dependency-audit.yml 1).
- **concurrency** par workflow :
  `group: <workflow>-<github.ref>`, `cancel-in-progress` pour les `pull_request` —
  les PRs Renovate et les pushes rapides n'empilent pas des dizaines de jobs
  derrière 2 réplicas.
- **Bump actions mortes** : `upload-artifact@v3` / `download-artifact@v3` → `@v4`
  (le service artefacts v1 sous-jacent est décommissionné par GitHub — ces steps
  échouent déjà sur ubuntu-latest). `actions/cache@v4` et `checkout@v4` restent ;
  les bumps ultérieurs seront gérés par la règle Renovate « github-actions ».
- **Job `Test` rendu bloquant** dans `ci.yml` : retrait du `continue-on-error: true`
  du step de tests (le commentaire de couverture advisory reste vrai via Codecov ;
  mettre à jour le commentaire du step). L'E2E reste `continue-on-error: true`
  (flakiness multi-navigateurs documentée en place).
- Les steps `playwright install --with-deps` restent en place (rapides une fois les
  deps système et le cache navigateurs présents dans le volume).
- Les caches `actions/cache` pnpm restent (utiles si un jour un job repasse sur
  GitHub-hosted) ; sur self-hosted, le store pnpm du volume est déjà chaud.

### Mécanisme d'auto-merge

Sans protection de branche, l'auto-merge natif GitHub fusionne dès que la PR est
« mergeable » — potentiellement avant que la CI ait tourné. Garantie requise :

1. **Protection de branche minimale sur `main`** (repo public : gratuite) :
   « Require status checks to pass before merging » avec **exactement ces checks**
   (noms `name:` des jobs de `ci.yml`, tels quels) :
   - `Lint & Type Check`
   - `Test`
   - `Build` (couvre transitivement security/docs + les guards ELK/AI-lazy/CDN-embed)
   NE PAS activer « Require branches to be up to date before merging » (les PRs
   Renovate boucleraient en outdated après chaque merge) ni « Require approvals »
   (le propriétaire ne peut pas approuver ses propres PRs — l'auto-merge serait
   impossible pour toujours). Sans « Include administrators », le push direct du
   propriétaire sur `main` reste possible.
2. **Setting du dépôt** : Settings → General → Pull Requests → **Allow auto-merge**.
3. Renovate : `platformAutomerge: true` (auto-merge native, respecte la protection).

### Mode dégradé (machine ou Docker Desktop éteints)

Comportement GitHub standard : les workflows `schedule` restent en file d'attente et
s'exécutent à la reconnexion des runners (les PRs Renovate rattrapées au boot du
conteneur). La `concurrency` ajoutée aux workflows borne la rafale de démarrage.
Aucun monitoring dédié (non-goal, setup mono-utilisateur) ; le kill-switch du README
couvre l'inverse (couper volontairement).

### Politique de mise à jour de l'infrastructure elle-même

- Les managers Renovate `dockerfile` et `docker-compose` sont activés pour les pins
  d'images infra (`actions-runner`, `renovate`) dans un groupe dédié avec
  `automerge: false` — l'infrastructure locale se met à jour sous revue, avec un
  `docker compose build` au prochain boot (procédure README).
- PATs fine-grained : expiration maximale 1 an ; rappel de renouvellement à ~9 mois
  dans le README (section opérations).

### Flux de bout en bout (PR non-major hebdo)

```
[lundi 07h max, America/New_York]
Renovate (conteneur local) → run quotidien
  → crée la PR « chore(deps): non-major updates » vers main
      ↓ (déclenche GitHub)
ci.yml  : lint → test×2 → security → docs → build (+guard ELK/AI/CDN)
e2e-tests.yml : 3× navigateur + performance + 5× cross-browser
  → tous sur runner-1/runner-2 (0 minute GitHub)
      ↓ (tous verts)
GitHub native auto-merge (setting « Allow auto-merge »)
  → merge sur main
      ↓
Vercel déploie la production (comportement voulu, propriétaire informé)
      ↓
Majors éventuelles : PRs séparées, SANS auto-merge, revue manuelle
```

## Sécurité (dépôt public)

1. **Fork PRs** : GitHub exige l'approbation du mainteneur pour les workflows de PRs
   de contributeurs extérieurs (défaut conservé — ne jamais le passer à
   « automatically run »). Le propriétaire est (pour l'instant) l'unique
   contributeur : les PRs qu'il crée lui-même exécutent du code qu'il maîtrise.
2. **Secrets** : les secrets du dépôt (SNYK_TOKEN, GITHUB_TOKEN…) sont injectés dans
   les jobs qui tournent sur la machine locale. Accepté explicitement pour un setup
   mono-utilisateur ; documenté comme trade-off dans `self-hosted/README.md`.
3. **Kill-switch** : `docker compose -f self-hosted/docker-compose.yml stop`
   coupe runner + Renovate instantanément (procédure en tête de README).
4. **PATs** : deux PAT fine-grained séparés, permissions minimales —
   - `RUNNER_PAT` : repository « Administration » (read/write) sur ce seul dépôt
     (création de registration tokens) ;
   - `RENOVATE_TOKEN` : Contents (read/write), Pull requests (read/write),
     Workflows (read/write — nécessaire pour le manager github-actions),
     Metadata (read).
5. **Éphémère** : les runners ne vivent pas entre les jobs — réduit la surface
   d'un job compromis et évite les runners fantômes.

## Ce que fait l'implémentation (builder)

- Créer l'arborescence `self-hosted/` + `renovate.json` + adaptations workflows.
- Épingler les versions d'images (`actions-runner`, `renovate`) à la version
  courante au moment du travail.
- Lint des workflows (`actionlint` si disponible) et build local de l'image runner
  (`docker build`) pour vérifier le Dockerfile.
- Vérifier le `renovate.json` avec le validateur officiel ou un dry-run Renovate
  (`RENOVATE_DRY_RUN=full`) hors commit.
- Rédiger `self-hosted/README.md` (activation, opérations, arrêt d'urgence,
  dépannage : socket Docker, cache GHA, Place de `docker.sock` GID si refusé).

## Ce qui reste à l'utilisateur (activation — non automatisable ici)

1. Créer les deux PAT fine-grained (README : liens + cases exactes).
2. Copier `self-hosted/.env.example` → `self-hosted/.env`, renseigner les tokens.
3. `docker compose -f self-hosted/docker-compose.yml up -d --build`
4. Settings GitHub → « Allow auto-merge » (Pull Requests) activé.
5. Vérifier que le runner apparaît vert dans Settings → Actions → Runners.

## Critères d'acceptation

1. `actionlint` passe sur les 4 workflows modifiés (si l'outil est disponible).
2. L'image runner se construit (`docker build`) sur la machine hôte.
3. Un `workflow_dispatch` de `dependency-audit.yml` s'exécute de bout en bout sur
   un runner local (visible vert dans l'onglet Actions, « runner: mermaidstudio-runner-N »).
4. Renovate fait un dry-run propre ; en live il crée la PR hebdo ou déclare « nothing
   to update » sans erreur.
5. Une PR non-major (créée à la main si besoin pour tester) est fusionnée
   automatiquement après CI verte.
6. Les 4 workflows migrés ne s'exécutent plus sur des runners GitHub-hosted
   (onglet Actions : chaque run indique `mermaidstudio-runner-N`) — plus aucune
   minute facturée par ces workflows.

## Décisions laissées au builder (mineures, figées dans le code)

- Version exacte des images épinglées (dernière stable au moment du travail).
- Détails de l'entrypoint (extraction du token, gestion du trap, logs).
- Liste exacte des paquets apt de Playwright (délivrée par `playwright install-deps`).
- Réglage fin des timeouts/cadences (boucle Renovate 24 h, offsets).

## Problèmes connus hors scope (repérés à la revue, non traités ici)

- `e2e-tests.yml` : la matrice cross-browser définit `PLAYWRIGHT_BROWSER` mais
  `playwright.config.ts` ne le lit pas — les entrées edge/chrome rejouent la même
  suite chromium (5 jobs redondants à chaque PR). Hors scope de ce design ; à
  traiter séparément si la charge locale le justifie.
