---
target: workspace desktop principal (AppLayout)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
target_fingerprint: "sha256:62f015fd19e004734a7a23e80adea51673cb95b0b54d131e99e5eca38c95fb9c"
target_path: "D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
timestamp: 2026-10-04T02-39-01Z
slug: src-components-layout-applayout-tsx
---
# Critique — workspace desktop MermaidStudio (itération 5, finale)

Method: dual-agent (A: revue design · B: détecteur + évidence browser)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Points ambre titrés, « Saved 1h ago » vrai, render time, toasts — excellent |
| 2 | Match System / Real World | 3 | Langage clair ; fuites : « checkpoint », machine size low/high |
| 3 | User Control and Freedom | 3 | Escape prouvé live sur dialog ouvert à la souris ; focus retombe sur BODY au close |
| 4 | Consistency and Standards | 2 | Dualité dialog (BackupPanel vs Modal) — chantier structurel |
| 5 | Error Prevention | 3 | Pré-checks, validation, confirmations ; import = remplacement total sans confirmation |
| 6 | Recognition Rather Than Recall | 3 | Chips visibles, palette ; clusters d'icônes = survol obligatoire |
| 7 | Flexibility and Efficiency | 3 | Raccourcis, Ctrl+S checkpoints, tabs clavier, bulk select |
| 8 | Aesthetic and Minimalist Design | 2 | Densité chrome non traitée (~15 contrôles) — chantier structurel |
| 9 | Error Recovery | 3 | Messages parse traduits ; état vide sans CTA de sortie |
| 10 | Help and Documentation | 2 | Modal raccourcis + Release Notes ; pas d'aide contextuelle aux moments à risque |
| **Total** | | **28/40** | **Good — plateau structurel (23 → 25 → 29 → 28 → 28)** |

## Design Specificity Verdict

Cœur authored (bilinguisme ICU jusque dans les pluriels, statut qui parle métier, chips alignées tag-color, autocomplete Mermaid), chrome interchangeable. La couture : deux systèmes de dialog coexistent (BackupPanel fait main vs Modal partagé animé). Les fixes passe-5 étaient de la justesse, pas de l'identité.

## Déterministe

CLI 0. Runtime : low-contrast 0, undersized 0 (2 vues, constant sur 3 itérations). Deltas = artefacts d'instrument : edge-flush (viewport non apparié, même node-overlay canvas), text-occlusion ×4 (auto-mesure des labels du détecteur, obs 4840), dark-glow (page-level, jamais sur surfaces visibles).

## Fixes passe-5 : 5/6 confirmés

1. **Focus management dialogs** — FIXÉ, PROUVÉ LIVE (clic souris → focus panneau → Escape réel ferme) ; BackupPanel + Modal partagé + folder picker (autoFocus)
2. X BackupPanel nommé — ✅
3. Bordure qui colle — ✅ (classes hover, plus de handlers JS)
4. Toast import i18n avec plurals — ✅ code (non exercé live, protocole)
5. Point ambre titré — ✅ code
6. Seed tags — PARTIEL : nouveau store OK (2/3 tags liés), mais profils existants non migrés (diagramTags: 0 persisté) → « No matching diagrams » au premier chip, prouvé live ; nécessite un backfill au load (chantier)

## Plateau (verdict A)

« Le score est à un plateau structurel : 28/40 identique à l'itération 4 alors que six correctifs ont été livrés et cinq sur six sont bons. Les trois chantiers qui plafonnent la note ne sont pas des correctifs mais des décisions d'architecture d'interface : (1) le système dialog — une primitive Dialog unique avec focus trap et restauration ; (2) la densité chrome — décider ce qui est primaire, ce qui part dans un menu More ; (3) les données first-run — un chemin de migration pour les stores existants. Les micro-fixes ont atteint leur rendement marginal. »

## Priority Issues restantes (pour un prochain milestone)

- [P1] Import remplace tout le dataset sans confirmation ni snapshot pré-import → harden
- [P1] Primitive Dialog unique (focus trap + restauration au trigger) ; test Modal « trap focus » vacueux à remplacer → shape + harden
- [P2] Backfill seed tags sur profils existants + CTA « Clear filter » → harden
- [P2] Densité chrome : menu « More », hiérarchie assumée → distill
- [P3] Copy/mécanismes : hover-border unifié, descriptions Export/Import harmonisées, en-têtes redondants → clarify + polish
