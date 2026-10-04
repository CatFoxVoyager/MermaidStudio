---
target: workspace desktop principal (AppLayout)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
target_fingerprint: "sha256:62f015fd19e004734a7a23e80adea51673cb95b0b54d131e99e5eca38c95fb9c"
target_path: "D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
timestamp: 2026-10-04T00-28-57Z
slug: src-components-layout-applayout-tsx
---
# Critique — workspace desktop MermaidStudio (itération 1)

Method: dual-agent (A: revue design · B: détecteur + évidence browser)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Status bar « Not saved » pendant que l'auto-save (1 s) a déjà persisté — statut malhonnête |
| 2 | Match System / Real World | 2 | Le bouton Save crée un snapshot de version, pas « la sauvegarde » — mental model contredit |
| 3 | User Control and Freedom | 2 | Menu langue : ni clic-extérieur ni Escape ne le ferment (vérifié live) |
| 4 | Consistency and Standards | 2 | hover:bg-white/8 sur surfaces blanches = hover invisible en light theme ; strings EN codées en dur |
| 5 | Error Prevention | 2 | Suppression de dossier sans confirmation — le plus destructif est le moins gardé |
| 6 | Recognition Rather Than Recall | 3 | Labels+icônes partout, palette groupée ; raccourcis invisibles en contexte (title hover only) |
| 7 | Flexibility and Efficiency | 3 | Ctrl+K/T/N/S/E/B, bulk select, auto-snapshot, split redimensionnable — bon set |
| 8 | Aesthetic and Minimalist Design | 2 | 16 contrôles dans 40 px de toolbar + 19 sur la preview = 5 bandes de chrome avant le contenu |
| 9 | Error Recovery | 3 | Boucle erreur→Fix réelle ; échec de persistance en toast |
| 10 | Help and Documentation | 2 | Release notes, About, hint palette ; pas de cheat-sheet raccourcis dans le workspace |
| **Total** | | **23/40** | **Acceptable (20-27)** |

## Design Specificity Verdict

**LLM** : Exécution genre-parfaite d'outil dev — palette GitHub-dark (#0d1117), Inter + JetBrains Mono, chrome hairline, accent teal — qui crie « outil développeur » mais murmure à peine « MermaidStudio ». Signatures propres au produit : le canvas live en grille de points et le badge « 226 ms render » dans la status bar ; le reste du chrome survivrait à un swap de logo. Le vrai actif d'identité (le split code-coloré → diagramme vivant) fonctionne mais est noyé sous un mur de micro-boutons.

**Déterministe** : CLI `impeccable detect` sur src/App.tsx + src/components (82 fichiers) : **0 finding** (exit 0). Le runtime navigateur, lui, rapporte **35 diagnostics sur la vue principale** — la CLI ne voit pas les 5 règles détectées en runtime (undersized-ui-text ×25, clipped-overflow-container ×7, overused-font ×1, nested-cards ×1, edge-flush-cards ×1) ; sur le modal Backup & Import : +2 low-contrast (4.4:1, seuil 4.5:1). Le détecteur a quantifié l'ampleur exacte d'un problème que la revue design avait repéré qualitativement : **25 textes sous le plancher 11px, dont 13 à 9px** (formes de la barre SHAPES, status bar à 10px, labels méta).

**Overlays** : injection réussie sur 2 vues (principale + Backup & Import) via livraison same-origin (COEP require-corp bloque toute livraison cross-origin) ; overlays visibles dans le tab d'inspection, fermé depuis.

## Overall Impression

Les fondations sont saines : un système de tokens discipliné, une boucle live code→diagramme qui prouve la valeur du produit en trois secondes, et une command palette qui sent le craft. Mais le plafond est bas : un modèle de sauvegarde qui ment (« Not saved » alors que tout est persisté), une toolbar de 16 micro-labels qui mange le gain de clics, et une typographie de chrome descendue à 9-10px qui épuise. La plus grosse opportunité : rendre véridique le contrat de non-perte de travail, et rendre l'écran respirable — deux chantiers qui relèvent du texte et de la hiérarchie, pas d'un redesign.

## What's Working

1. **La boucle live code→diagramme** : split 40/60, syntaxe colorée, grille de points, latence affichée — la raison d'être du produit est sensible en trois secondes, sans onboarding.
2. **La command palette (Ctrl+K)** : groupes ACTIONS/SETTINGS, descriptions, backdrop blur, hint clavier — la seule surface de craft délibéré uniforme.
3. **Discipline de tokens** : un seul système de CSS vars pilote les deux thèmes ; le chrome reste neutre et le diagramme — seule chose colorée — possède l'écran.

## Priority Issues

- **[P0] Suppression de dossier sans confirmation** — `src/components/sidebar/Sidebar.tsx` : le context-menu « Supprimer le dossier » appelle `deleteFolder(f.id)` immédiatement, détruisant le sous-arbre sans modale ni undo, alors que la modale `deleteConfirm` existe déjà pour les diagrammes. Fix : router vers la même modale (compter les diagrammes contenus dans le message). *Commande : harden*
- **[P1] Typographie du chrome sous le plancher de lisibilité** — 25 éléments à <11px (13 à 9px : labels de formes SHAPES ; 10px : status bar, méta de fichiers, hints). Fix : plancher 11px, status bar 12px, labels de formes 11px. *Commande : typeset*
- **[P1] Mur-toolbar de l'éditeur** — `WorkspacePanel.tsx` : 16 contrôles, labels 11px wrappant sur 2 lignes dans 40px. Fix : 4-5 boutons labellisés (Save, Export, AI, Diff) + icônes-tooltip + overflow « ⋯ » ; persister le toggle Collapse (useState non persisté). *Commande : distill*
- **[P1] Malhonnêteté du modèle Save** — status bar « Not saved » pendant que l'auto-save a persisté ; Save désactivé + dot ambre impliquent un risque inexistant. Fix : trois états véridiques (« Checkpointed 12:04 » / « Checkpointing… » / « Unsaved — Ctrl+S ») ou renommer Save→Checkpoint. *Commande : clarify*
- **[P2] Hover invisible en light theme** — hover:bg-white/8 sur surfaces blanches (TopBar, toolbar, sidebar, menus) : delta nul dans le thème par défaut. Fix : token --hover par thème. *Commande : colorize*
- **[P2] Hygiène a11y des affordances** — menu langue sans Escape/outside-click ni aria-expanded ; modale de suppression sans role=dialog ni focus trap ; boutons « ⋯ » sidebar en opacity-0 sans focus-within. Fix : popover fermable, focus trap, reveal au focus. *Commande : harden*
- **[P3] Contraste limite** — 2 textes à 4.4:1 dans Backup & Import (#6b7280 sur #f4f4f2, marge 0.1 sous le seuil) ; règle faillible sur fixed/sticky, à re-vérifier avant correction. *Commande : audit*

Faux positifs du détecteur exclus des corrections : clipped-overflow-container ×7 (coquilles flex/overflow-hidden structurelles), edge-flush-cards (node-overlay du canvas, positionné par design), overused-font (Inter sur un app produit = standard), nested-cards ×1.

## Persona Red Flags

**Alex (power user)** — préférence Collapse labels non persistée (perdue à chaque reload) ; raccourcis clavier invisibles en contexte (uniquement dans les titles) ; deux panneaux ouverts étranglent l'éditeur à ~320px sur 1440 ; Ctrl+F hijack du find navigateur.

**Sam (accessibilité)** — boutons « ⋯ » de la sidebar invisibles au focus clavier (opacity-0 sans focus-within) ; menu langue incurable au clavier ; modale de suppression sans focus trap ni role ; hover feedback nulle en light theme ; chrome à 9-12px.

**Riley (stress tester)** — delete dossier en un clic destructeur ; refresh en pleine frappe : OK (auto-save 1 s + flush au close — vrai point fort) ; menu langue stuck chevauchant la toolbar après interactions ordinaires.

## Minor Observations

- Spinner animate-spin permanent sur l'icône Auto-snapshot quand activé — lit comme une activité continue
- Dot dirty du TabBar visible uniquement au hover
- Strings EN codées en dur : « Auto-snapshot », « Off/1 min », « Copy code », « Diff », « Fix », « Toggle theme » (aria), « open source » — casse la promesse bilingue en/fr
- Dropdown langue collé au bord viewport, sans backdrop, au-dessus de la toolbar
- Chip « Flowchart » de la preview duplique le type affiché dans la status bar
- Barre Select/Connect/SHAPES (8 formes) montée en mode split — confond deux paradigmes d'édition
- Empty state : 3 cartes propres, hint Ctrl+T sur une seule — bon mais inégal

## Questions to Consider

1. Si l'auto-save persiste tout après une seconde, à quoi sert vraiment le bouton Save — et « Checkpoint » ne dirait-il pas plus vrai que « Save » ?
2. La toolbar répond « tout est à un clic » — mais 16 labels deux-lignes coûtent-ils moins de temps d'orientation que les deux clics d'un menu ⋯ ?
3. Masquez le logo : que reste-t-il qu'un éditeur Mermaid générique ne donnerait pas — où est la voix de MermaidStudio au-delà de la grille de points ?
