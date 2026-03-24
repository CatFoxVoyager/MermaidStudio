# Stack Technique - MermaidStudio

## Versions Actuelles

Ce document détaille les versions des dépendances principales utilisées dans le projet.

### Framework & Build

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **React** | 19.2.4 | Bibliothèque UI avec fonctionnalités concurrentes, Server Components, et hooks améliorés |
| **TypeScript** | 5.9.3 | Superset typé de JavaScript avec vérification statique |
| **Vite** | 8.0.2 | Outil de build ultra-rapide basé sur esbuild avec HMR optimisé |
| **Tailwind CSS** | 4.2.2 | Framework CSS utilitaire-first avec configuration v4 et compiler optimisé |

### Diagramme & Rendu

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **Mermaid** | 11.13.0 | Bibliothèque de rendu de diagrammes (dernière version stable) |
| **html-to-image** | ^2.1.0 | Export d'éléments DOM en images (PNG, JPEG) |

### Tests

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **Vitest** | ^2.4.5 | Framework de tests unitaires ultra-rapide intégré à Vite |
| **Playwright** | ^1.50.1 | Framework de tests E2E pour navigateurs modernes |
| **@testing-library** | ^16.1.0 | Utilitaires de tests React pour DOM |
| **Happy DOM** | ^15.0.0 | Implémentation DOM légère pour tests unitaires |

### Éditeur de Code

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **CodeMirror** | ^6.0.1 | Éditeur de code avec support Mermaid et coloration syntaxique |
| **@codemirror/lang-javascript** | ^6.0.1 | Support JavaScript pour CodeMirror 6 |
| **@codemirror/theme-one-dark** | ^6.0.1 | Thème sombre pour CodeMirror |

### UI Components

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **Radix UI** | ^1.1.5 | Composants UI accessibles et headless |
| **Lucide React** | ^0.468.0 | Bibliothèque d'icônes modernes et cohérentes |

### Internationalisation

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **i18next** | ^24.2.0 | Framework d'internationalisation React |
| **react-i18next** | ^15.3.0 | Hooks React pour i18next |

### Stockage & Utilitaires

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **dexie** | ^4.0.11 | Base de données IndexedDB wrapper pour stockage local |
| **DOMPurify** | ^3.2.3 | Nettoyage HTML pour protection XSS |
| **clsx** | ^2.1.1 | Utilitaire pour les noms de classes conditionnelles |
| **date-fns** | ^4.1.0 | Manipulation et formatage de dates |

### IA Integration

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **@anthropic-ai/sdk** | ^0.32.1 | SDK Anthropic officiel pour Claude AI |
| **openai** | ^4.89.0 | SDK OpenAI pour GPT-4 et modèles compatibles |
| **@google-cloud/ai-generativelanguage** | ^2.8.0 | SDK Google pour Gemini et autres modèles |

### Linting & Formatage

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **ESLint** | ^9.25.0 | Linter JavaScript/TypeScript |
| **TypeScript ESLint** | ^8.25.0 | Plugin TypeScript pour ESLint |
| **Prettier** | 3.5.2 | Formateur de code automatique |
| **@typescript-eslint** | ^8.25.0 | Règles ESLint pour TypeScript |
| **eslint-plugin-react** | ^7.37.2 | Règles ESLint pour React |
| **eslint-plugin-react-hooks** | ^5.2.2 | Règles ESLint pour React Hooks |
| **eslint-plugin-jsx-a11y** | ^6.10.2 | Règles d'accessibilité pour JSX |

### Git & Quality

| Dépendance | Version | Description |
|-------------|---------|-------------|
| **Husky** | 9.1.7 | Git hooks pour exécuter des scripts avant commit/push |
| **lint-staged** | ^15.4.3 | Exécute des commandes sur fichiers git stagés |
| **@commitlint/cli** | ^19.8.0 | Lint de messages de commit conventionnels |
| **@commitlint/config-conventional** | ^19.8.0 | Configuration conventionnelle pour commitlint |

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
npm run lint         # Exécuter ESLint
npm run lint:fix     # Corriger automatiquement les problèmes ESLint
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
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Plateformes
- Windows 10+
- macOS 12+
- Linux (Ubuntu 20.04+, Debian 12+)

## Configuration Requise

### Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Providers IA (optionnel - un ou plusieurs requis pour les fonctionnalités IA)
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Configuration (optionnel)
VITE_DEFAULT_THEME=dark
VITE_DEFAULT_LANGUAGE=en
```

### Configuration Vite

Le fichier `vite.config.ts` configure :
- Le plugin React pour Vite
- Le plugin Tailwind CSS v4
- Les alias de chemins (@/ pour src/)
- Les options de build pour la production

## Migration Récente

### Tailwind CSS v3 → v4
- Mise à jour du fichier `tailwind.config.js` vers `tailwind.config.ts`
- Utilisation du nouveau compiler Tailwind v4
- Configuration de l'import CSS avec `@import "tailwindcss"`

### React 18 → 19
- Mise à jour vers React 19.2.4
- Support des React Server Components (préparation)
- Utilisation des hooks améliorés

### Vite 4 → 8
- Mise à jour vers Vite 8.0.2
- Amélioration des performances de build
- Meilleure gestion du HMR (Hot Module Replacement)

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

- **Node.js** : 24.0.0 ou supérieur
- **npm** : 10.0.0 ou supérieur (ou pnpm/bun)
- **Git** : 2.0+ (optionnel)

## Dépendances Optionnelles

Certains packages sont des dépendances de développement uniquement :

- `@types/*` : Définitions TypeScript pour les packages sans types
- `eslint-*` : Outils de linting et formatage
- `vitest` : Framework de tests
- `playwright` : Tests E2E
- `prettier` : Formatage de code

Ces packages ne sont pas inclus dans le build de production.
