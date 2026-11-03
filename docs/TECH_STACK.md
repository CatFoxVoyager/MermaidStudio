# Stack Technique - MermaidStudio

## Versions Actuelles

Ce document détaille les versions des dépendances principales utilisées dans le projet.

### Framework & Build

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **React** | ^19.3.1 | Bibliothèque UI avec fonctionnalités concurrentes, Server Components, et hooks améliorés |
| **TypeScript** | ^7.0.2 | Superset typé de JavaScript avec vérification statique |
| **Vite** | ^8.3.5 | Outil de build ultra-rapide basé sur esbuild avec HMR optimisé |
| **Tailwind CSS** | ^4.3.3 | Framework CSS utilitaire-first (plugin PostCSS `@tailwindcss/postcss`, pas de fichier de config) |

### Diagramme & Rendu

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **Mermaid** | 12.2.0 (pin exact, sans caret) | Bibliothèque de rendu de diagrammes |
| **html2canvas** | ^1.4.1 | Présente dans les dépendances (export image) — non importée par le code `src/` actuel, l'export PNG passe par un rendu SVG→canvas maison |

### Tests

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **Vitest** | ^5.0.5 | Framework de tests unitaires ultra-rapide intégré à Vite |
| **Playwright** | ^1.64.1 | Framework de tests E2E pour navigateurs modernes |
| **@testing-library/react** | ^16.3.3 | Utilitaires de tests React pour DOM |
| **jsdom** | ^30.1.3 | Environnement DOM pour tests unitaires |
| **fake-indexeddb** | ^6.2.7 | IndexedDB en mémoire pour les tests de stockage |

### Éditeur de Code

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **CodeMirror** | ^6.0.2 | Éditeur de code avec support Mermaid et coloration syntaxique |
| **@codemirror/** (autocomplete, commands, language, lint, search, state, view) | ^6.x | Paquets CodeMirror 6 modulaires |
| **@codemirror/theme-one-dark** | ^6.1.3 | Thème sombre pour CodeMirror |

### UI Components

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **Radix UI** (@radix-ui/react-context-menu, react-toast) | ^2.4.1 / ^1.3.1 | Composants UI accessibles et headless |
| **Lucide React** | ^1.66.0 | Bibliothèque d'icônes modernes et cohérentes |

### Internationalisation

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **i18next** | ^26.7.1 | Framework d'internationalisation React |
| **react-i18next** | ^17.1.11 | Hooks React pour i18next |

### Stockage & Utilitaires

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **IndexedDB** (wrapper maison) | — | `src/services/storage/database.ts` : wrapper IndexedDB écrit à la main (base `MermaidStudio`), pas de lib tierce |
| **DOMPurify** | ^3.4.17 | Nettoyage HTML pour protection XSS |
| **dayjs** | ^1.11.23 | Manipulation et formatage de dates |
| **khroma** | ^2.1.0 | Manipulation de couleurs |
| **react-markdown** | ^10.1.0 | Rendu Markdown (panneau IA) |
| **@vercel/analytics / speed-insights** | ^2.x | Analytics et Speed Insights côté site |

### IA Integration

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **@mlc-ai/web-llm** | vendored `file:vendor/mlc-ai-web-llm-0.2.83.tgz` | LLM in-browser via WebGPU (aucun appel cloud, aucune clé API) |
| **@huggingface/transformers** | ^4.3.2 | Runtime ONNX/transformers pour fonctionnalités IA locales |

### Linting & Formatage

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **OxLint** | ^1.90.0 | Linter JavaScript/TypeScript (a remplacé ESLint + typescript-eslint) |
| **Prettier** | ^3.9.10 | Formateur de code automatique |

### Git & Quality

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **Husky** | ^9.1.7 | Git hooks pour exécuter des scripts avant commit/push |
| **lint-staged** | ^17.6.0 | Exécute des commandes sur fichiers git stagés |
| **@commitlint/cli** | ^21.2.4 | Lint de messages de commit conventionnels |
| **@commitlint/config-conventional** | ^21.2.4 | Configuration conventionnelle pour commitlint |

## Scripts NPM Disponibles

### Développement
```bash
npm run dev          # Démarrer le serveur de développement (Vite)
npm run build        # Construire pour la production
npm run preview      # Prévisualiser le build de production localement
npm run type-check   # Vérification des types TypeScript
```

### Qualité
```bash
npm run lint         # Exécuter OxLint (oxlint src)
npm run lint:fix     # Corriger automatiquement les problèmes OxLint
npm run type-check   # Vérification des types (tsconfig.app.json + tsconfig.node.json)
npm run format       # Formater le code avec Prettier
```

### Tests
```bash
npm test             # Exécuter les tests unitaires (Vitest)
npm run test:ui      # Exécuter les tests avec interface visuelle Vitest
npm run test:e2e     # Exécuter les tests E2E (Playwright)
npm run test:coverage # Exécuter les tests avec couverture de code
```

### Git
```bash
npm run prepare      # Installer les hooks Husky
```

## Compatibilité

### Navigateurs Supportés
Le floor effectif est celui de **mermaid 12** (syntaxe ES2024) : il n'y a ni
transpilation ni polyfill de secours. Détail technique :
[developer-guide/browser-support.md](./developer-guide/browser-support.md).

- Chrome/Edge, Firefox et Safari/WebKit récents (le build cible `esnext`)
- **iOS/Safari ≤ 17.3 non supportés** : le bundle ne parse pas et l'app ne charge pas

### Plateformes
- Windows 10+
- macOS 12+
- Linux (Ubuntu 20.04+, Debian 12+)

## Configuration Requise

### Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Configuration (optionnel)
VITE_DEFAULT_THEME=dark
VITE_DEFAULT_LANGUAGE=en
VITE_DEV_SERVER_PORT=5173
```

> **IA** : la seule intégration IA active est le **WebGPU/MLC in-browser**
> (`src/services/ai/WebGPUMLCProvider.ts`) — **aucune clé API n'est requise**.
> Les variables `VITE_OPENAI_*` / `VITE_ANTHROPIC_*` / etc. de `.env.example`
> sont historiques et non lues par le code actuel.

### Configuration Vite

Le fichier `vite.config.ts` configure :
- Le plugin React pour Vite
- Le plugin Tailwind CSS v4
- Les alias de chemins (@/ pour src/)
- Les options de build pour la production

## Migration Récente

### Tailwind CSS v3 → v4
- Plus aucun fichier `tailwind.config.*` : configuration via le plugin PostCSS `@tailwindcss/postcss`
- Import CSS avec `@import "tailwindcss"` (`src/index.css`)

### React 18 → 19
- Mise à jour vers React 19.3.1
- Support des React Server Components (préparation)
- Utilisation des hooks améliorés

### Vite 4 → 8
- Mise à jour vers Vite 8.3.5
- Amélioration des performances de build
- Meilleure gestion du HMR (Hot Module Replacement)

### ESLint → OxLint
- ESLint et l'écosystème typescript-eslint retirés (leur peer range plafonnait TypeScript < 7)
- Remplacés par **OxLint** (`.oxlintrc.json`), exécuté via `npm run lint`

## Développement

### Structure des Commandes

```bash
# Installation
npm install

# Développement
npm run dev

# Build
npm run build

# Tests
npm test
npm run test:e2e

# Qualité
npm run lint
npm run format
npm run type-check
```

### Prérequis Système

- **Node.js** : 24 (engines : `^24.22.2`)
- **pnpm 10** : gestionnaire canonique (`packageManager: pnpm@10.34.9`) ; npm ≥ 10.9.9 également accepté
- **Git** : 2.0+ (optionnel)

## Dépendances Optionnelles

Certains packages sont des dépendances de développement uniquement :

- `@types/*` : Définitions TypeScript pour les packages sans types
- `oxlint` : Linting
- `vitest` : Framework de tests
- `playwright` : Tests E2E
- `prettier` : Formatage de code

Ces packages ne sont pas inclus dans le build de production.

*Updated: 2026-11-03*
