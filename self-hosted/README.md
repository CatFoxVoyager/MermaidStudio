# CI self-hosted et Renovate — activation et opérations

Ce dossier fait tourner **en local** la CI de MermaidStudio : deux runners
GitHub Actions (`runner-1`, `runner-2`) et un conteneur **Renovate**
auto-hébergé. Ce README est le guide d'activation et d'exploitation destiné au
propriétaire du dépôt ; l'activation demande ses identifiants GitHub et son
Docker Desktop.

- Stack : [`docker-compose.yml`](./docker-compose.yml) — services `runner-1`,
  `runner-2`, `renovate` ; volumes `runner1-home`, `runner2-home`,
  `renovate-cache` ; image runner construite localement depuis
  [`runner/Dockerfile`](./runner/Dockerfile) (base `actions-runner` **2.338.2**) ;
  Renovate `ghcr.io/renovatebot/renovate:44.190.2` piloté par
  [`renovate/config.js`](./renovate/config.js).
- Configuration par-dépôt de Renovate : [`renovate.json`](../renovate.json) (racine).
- `self-hosted/.env` contient les PATs : il est git-ignoré et ne doit **jamais**
  être commité.

## 1. Arrêt d'urgence

Un seul geste coupe tout (les 2 runners + Renovate), depuis la racine du dépôt :

```bash
docker compose -f self-hosted/docker-compose.yml stop
```

Pour reprendre : `docker compose -f self-hosted/docker-compose.yml up -d`.

## 2. Activation (pas-à-pas)

### 2.1 PAT 1 — `RUNNER_PAT` (enregistrement des runners)

GitHub → **Settings → Developer settings → Fine-grained tokens**
(<https://github.com/settings/personal-access-tokens/new>) :

- **Repository access** : *Only select repositories* → `CatFoxVoyager/MermaidStudio` (ce seul dépôt) ;
- **Permissions** : **Administration : Read and write** — rien d'autre ;
- Expiration : **≤ 1 an**.

### 2.2 PAT 2 — `RENOVATE_TOKEN` (Renovate)

Même chemin (<https://github.com/settings/personal-access-tokens/new>) :

- **Repository access** : `CatFoxVoyager/MermaidStudio` (ce seul dépôt) ;
- **Permissions** : **Contents : Read and write**, **Pull requests : Read and
  write**, **Workflows : Read and write**, **Metadata : Read-only** ;
- Expiration : **≤ 1 an**.

### 2.3 Renseigner `.env`

```bash
cp self-hosted/.env.example self-hosted/.env
```

Puis renseigner les deux lignes `RUNNER_PAT` et `RENOVATE_TOKEN` : **remplacer
la ligne entière** par `RUNNER_PAT=<valeur réelle>` / `RENOVATE_TOKEN=<valeur
réelle>` (sans le commentaire ni le placeholder). Le placeholder se lit
`github_pat_RUNNER_here` / `github_pat_RENOVATE_here` : tant que la ligne
complète n'est pas remplacée, c'est ce placeholder qui est utilisé. (Le fichier
`.env.example` se charge tel quel — compose v2 retire les commentaires en fin
de ligne — mais il ne se remplit pas tout seul.)

### 2.4 Démarrer la stack

```bash
docker compose -f self-hosted/docker-compose.yml up -d --build
```

### 2.5 Settings GitHub (auto-merge et protection de `main`)

1. **Allow auto-merge** : dépôt → **Settings → General → Pull Requests**
   (<https://github.com/CatFoxVoyager/MermaidStudio/settings>) → cocher
   **Allow auto-merge**.
2. **Protection de `main`** : **Settings → Branches**
   (<https://github.com/CatFoxVoyager/MermaidStudio/settings/branches>) →
   règle sur `main` :
   - **Require status checks to pass** → cocher exactement `Lint & Type Check`,
     `Test`, `Build` ;
   - **NE PAS** cocher **Require approvals** ;
   - **NE PAS** cocher **Require branches to be up to date before merging**
     (sinon l'auto-merge est bloqué : chaque PR Renovate attendrait un rebase
     dès qu'un autre commit arrive sur `main` — cf. design § Mécanisme
     d'auto-merge) ;
   - **NE PAS** cocher **Include administrators**.

   Si les trois checks n'apparaissent pas encore dans la liste de sélection,
   déclencher d'abord un run de `ci.yml` sur `main` (un push suffit) pour que
   GitHub les enregistre.

### 2.6 Vérifier les runners

**Settings → Actions → Runners**
(<https://github.com/CatFoxVoyager/MermaidStudio/settings/actions/runners>) :
`mermaidstudio-runner-1` et `mermaidstudio-runner-2` doivent apparaître en **Idle**.

### 2.7 Test de bout en bout

Actions → **Dependency Security Audit** → **Run workflow**
(`workflow_dispatch`) : confirmer que le job tourne sur le runner local
(ligne *Runner* du run = `mermaidstudio-runner-*`, pas un runner hébergé).

## 3. Opérations

- **Premier run Renovate à sec (checklist propriétaire — `RENOVATE_DRY_RUN=full`)**,
  depuis `self-hosted/` :

  ```bash
  cd self-hosted
  docker run --rm --env-file .env -e RENOVATE_DRY_RUN=full \
    -v "./renovate/config.js:/usr/src/app/config.js:ro" \
    ghcr.io/renovatebot/renovate:44.190.2 renovate
  ```

  Attendu : logs Renovate « Dry run », découverte du dépôt
  `CatFoxVoyager/MermaidStudio`, **aucune PR créée**. Ce one-shot n'utilise que
  `.env` et le montage de `config.js` — identiques au service compose ; s'il
  passe, le service `renovate` du compose (boucle quotidienne) fonctionnera.

- **Validation de la config Renovate** après toute modification de
  [`renovate.json`](../renovate.json), depuis la racine du dépôt :

  ```bash
  docker run --rm -v "./renovate.json:/usr/src/app/renovate.json:ro" \
    ghcr.io/renovatebot/renovate:44.190.2 renovate-config-validator \
    /usr/src/app/renovate.json
  ```

  Attendu : `Config validated successfully against 1 file(s)`.

- **Suivi** : `docker compose -f self-hosted/docker-compose.yml logs -f renovate`.

- **Conflits de lockfile** : Renovate rebasse seul les PRs devenues conflictuelles
  (lockfile maintenance + `rangeStrategy: bump`), sans intervention.

- **Mise à jour des images infra** (runner, Renovate) : Renovate ouvre une PR
  groupée (règle `chore(ci): self-hosted infra images`, revue **manuelle**).
  Après merge, reconstruire/rafraîchir au prochain boot :
  `docker compose -f self-hosted/docker-compose.yml up -d --build`.

- **Note de dépréciation `renovate.json`** : le champ `customManagers[].fileMatch`
  est déprécié en Renovate 44 (auto-migration, sans effet aujourd'hui) — le
  renommer en `managerFilePatterns` quand une montée de l'image Renovate franchit
  la suppression ; la PR « infra images » ouverte par la règle dédiée est
  l'endroit naturel pour le faire.

## 4. Invariants

- **Ne jamais renommer** les checks `Lint & Type Check` / `Test` / `Build` dans
  [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) sans mettre à jour
  la protection de branche (§ 2.5) : un check renommé mais non enregistré dans
  la règle bloque l'auto-merge **en silence** (les PRs Renovate restent
  indéfiniment en attente).
- Vérifier l'onglet **Checks** d'une PR Renovate : les trois checks ci-dessus
  doivent y figurer et passer — c'est la confirmation que la protection de
  branche et l'auto-merge sont alignés.

## 5. Mode dégradé

Machine éteinte : les runs planifiés (crons de `dependency-audit.yml` et
`docs.yml`, Renovate du lundi) ne tournent pas pendant l'arrêt. Au redémarrage,
les conteneurs repartent (`restart: unless-stopped`) et les runners
s'enregistrent à nouveau — le rattrapage des crons se fait au boot, borné par
les groupes `concurrency` des workflows (format
`${{ github.workflow }}-${{ github.ref }}`, avec `cancel-in-progress` sur les
PR) : pas d'empilement infini, seul le dernier état par branche est exécuté.

## 6. Dépannage

- **Socket Docker refusé dans le conteneur** : vérifier avec
  `docker compose -f self-hosted/docker-compose.yml exec runner-1 docker info`.
  En cas de `permission denied` : Docker Desktop → **Settings → Resources** →
  vérifier le partage (File Sharing / intégration WSL), ou ajouter
  `group_add: ["999"]` au service `runner-1`/`runner-2` du compose (le GID du
  groupe `docker` de l'hôte — l'adapter si besoin).
- **Cache buildx `type=gha` en échec** (job *Build and Push Docker Image* de
  `ci.yml`, `cache-from`/`cache-to` `type=gha`) : basculer sur `type=local`
  en montant un volume dédié (`cache-from: type=local,src=/tmp/.buildx-cache`,
  `cache-to: type=local,dest=/tmp/.buildx-cache-new` + volume compose).
- **PAT expiré** : symptôme — conteneur runner en boucle d'erreur
  **« Bad credentials »** (`docker compose -f self-hosted/docker-compose.yml
  logs runner-1`). Renouveler le PAT concerné (§ 8), mettre à jour `.env`
  (ligne entière remplacée, cf. § 2.3) puis
  `docker compose -f self-hosted/docker-compose.yml up -d --force-recreate`.

## 7. Sécurité

- Les secrets du dépôt (et les PATs de l'hôte) sont injectés dans les jobs qui
  tournent **sur la machine locale** : trade-off mono-utilisateur assumé
  (design § Sécurité) — le dépôt est **public** et le seul committer est le
  propriétaire ; personne d'autre ne peut y pousser des workflows.
- **Ne jamais** activer, dans **Settings → Actions → General → Fork pull
  request workflows from outside collaborators**, l'option
  **Automatically run** (laisser **Do not allow**) : un workflow de fork
  s'exécutant sur le runner local y trouverait les secrets.
- Le kill-switch est en tête de ce README (§ 1) : `stop` coupe tout
  immédiatement.

## 8. Renouvellement PATs

Rappel **~9 mois** (expiration max 1 an) : créer un rappel d'agenda à la
création des tokens (§ 2.1 / § 2.2). Symptôme d'expiration : boucle
« Bad credentials » côté runner (cf. Dépannage § 6) ou erreurs 401 dans les
logs `renovate`. Renouveler avant expiration, mettre à jour `.env` puis
`docker compose -f self-hosted/docker-compose.yml up -d --force-recreate`.
