---
target: workspace desktop principal (AppLayout)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
target_fingerprint: "sha256:62f015fd19e004734a7a23e80adea51673cb95b0b54d131e99e5eca38c95fb9c"
target_path: "D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
timestamp: 2026-10-04T02-40-05Z
slug: src-components-layout-applayout-tsx
---
# Critique — workspace desktop MermaidStudio (itération 4)

> NOTE : re-persisted after the fact (run of 2026-10-04 ~02:00); the live run
> report was delivered in chat but the snapshot write was missed. Content is
> the faithful condensed verdict of the dual-agent run.

Method: dual-agent (A: revue design · B: détecteur + évidence browser)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Chaîne honnête réparée, mais Ctrl+S ne stampe pas last_saved_at (« Saved 52s ago » après save manuel) |
| 2 | Match System / Real World | 3 | Toast d'import codé en dur EN ; « checkpoint » expliqué par tooltip |
| 3 | User Control and Freedom | 3 | Escape inerte sur dialogs ouverts à la souris (vérifié live) ; tabs clavier réparés |
| 4 | Consistency and Standards | 2 | 4 dialogs hand-rolled divergents du Modal partagé |
| 5 | Error Prevention | 3 | Confirmations avec comptage, pré-check taille, validation JSON |
| 6 | Recognition Rather Than Recall | 3 | Labels par défaut, tooltips, palette ; 7 icon-only restants |
| 7 | Flexibility and Efficiency | 3 | Tabs clavier réparés (vérifié live), Ctrl+S/F, bulk select |
| 8 | Aesthetic and Minimalist Design | 2 | Densité chrome reportée 2× : groupe de 10, Release Notes permanent, titre dupliqué |
| 9 | Error Recovery | 3 | Parse spécifique, Fix button ; toast de succès non traduit |
| 10 | Help and Documentation | 3 | Welcome diagram tuteur, raccourcis, hints contextuels |
| **Total** | | **28/40** | **Good (29 → 28 : bruit inter-évaluateur, tous les fixes confirmés présents)** |

## Design Specificity Verdict

Cœur authored, coquille générique : teal signature, light tokenisé, vocabulaire checkpoint, statut honnête — mais la coquille applicative (4 bandes de chrome) reste VSCode-lite. Les 12 points manquants sont prisonniers de 3 corrections structurelles (dialogs, densité, seed tags).

## Déterministe

CLI 0. Runtime 10 findings (edge-flush absent, −1 vs it.3) ; low-contrast 0, undersized 0, aucune nouvelle famille.

## Priority Issues (à l'époque)

- [P1] Dialogs aria-modal sans gestion de focus — Escape mort dans le chemin d'ouverture souris (vérifié live) ; focus trap absent ; X unnamed
- [P2] Chips de tag filtrent vers zéro au premier contact (seed sans relations)
- [P2] Densité chrome + titre dupliqué (reporté 2×)
- [P2] Couche dialogs incohérente ; toast import EN
- [P3] Bordure du bloc Import qui colle ('var(--border-subtle' invalide) ; checkbox de sélection sans nom
