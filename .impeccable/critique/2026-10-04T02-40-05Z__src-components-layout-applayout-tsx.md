---
target: workspace desktop principal (AppLayout)
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
target_fingerprint: "sha256:62f015fd19e004734a7a23e80adea51673cb95b0b54d131e99e5eca38c95fb9c"
target_path: "D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
timestamp: 2026-10-04T02-40-05Z
slug: src-components-layout-applayout-tsx
---
# Critique — workspace desktop MermaidStudio (itération 3)

> NOTE : re-persisted after the fact (run of 2026-10-04 ~01:40); the live run
> report was delivered in chat but the snapshot write was missed. Content is
> the faithful condensed verdict of the dual-agent run.

Method: dual-agent (A: revue design · B: détecteur + évidence browser)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | « Edited · autosaved » véridique, mais « Saved Nm ago » fabriqué à l'état clean |
| 2 | Match System / Real World | 3 | « removed from the sidebar » excellent ; collision « Auto-snapshot » vs autosave réel |
| 3 | User Control and Freedom | 2 | Escape généralisé ; pas de click-outside sur la modale delete ; pas d'undo delete dossier |
| 4 | Consistency and Standards | 2 | Deux systèmes de modales divergents ; focus-reveal inégal (TabBar) |
| 5 | Error Prevention | 3 | Modale véridique, focus sur l'action sûre, re-parenting non destructif |
| 6 | Recognition Rather Than Recall | 2 | 10 boutons icon-only : sens accessible uniquement au survol (title) |
| 7 | Flexibility and Efficiency | 3 | Palette, raccourcis, Collapse persisté, split draggable |
| 8 | Aesthetic and Minimalist Design | 3 | Light calme ; groupe médian de 10 icônes ; nœuds crème sur dark |
| 9 | Error Recovery | 2 | Fix contextuel OK ; suppression non réversible |
| 10 | Help and Documentation | 2 | Tooltips + release notes ; aucun libellé pour le cluster d'icônes |
| **Total** | | **29/40** | **Good (25 → 29, +4)** |

## Design Specificity Verdict

Spécifique et ancré — 4/5. Les fixes ne sont pas des palliatifs génériques : « Edited · autosaved » fondé sur l'architecture réelle (save débouncé vérifié dans useTabs), la modale folder décrit exactement la sémantique de deleteFolder, le token --hover est décliné par thème.

## Déterministe

CLI 0. Runtime : undersized-ui-text 25 → 0 (plancher 11px confirmé), low-contrast 2 → 0 (passation du token prouvée vivante via l'API dédiée), aucune régression ; restants = faux positifs structurels (clipped ×7 coquilles, edge-flush canvas, overused-font info).

## Priority Issues (à l'époque)

- [P1] Boutons icon-only sans nom accessible (title seul) — ToolbarButton, toggles TopBar, sidebar
- [P1] Bouton fermer d'onglet invisible au focus (TabBar)
- [P2] html lang figé à "en" en UI française
- [P2] « Saved Nm ago » fabriqué à l'état clean (lastSaved = new Date() au render)
- [P2] --text-tertiary sous AA (≈4.0:1 light / 3.8:1 dark)
- [P3 groupés] modales divergentes, « 1 diagrams? », kbd 10px, active:bg-white/15, bannière offline morte, ContextMenu danger ≈3:1

Fixes it.2 confirmés : 7/8 + i18n (statut EN+FR, toolbar distillée + Collapse persisté, hover token, menu langue dismissable, contraste secondary).
