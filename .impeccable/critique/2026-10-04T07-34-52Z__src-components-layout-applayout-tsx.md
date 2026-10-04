---
target: workspace desktop principal (AppLayout)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
target_fingerprint: "sha256:62f015fd19e004734a7a23e80adea51673cb95b0b54d131e99e5eca38c95fb9c"
target_path: "D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
timestamp: 2026-10-04T07-34-52Z
slug: src-components-layout-applayout-tsx
---
# Critique — workspace desktop MermaidStudio (itération 8, mesure finale)

Method: dual-agent (A: revue design · B: détecteur + évidence browser)

## Design Health Score

| # | Heuristic | Score | Δ it.7 |
|---|-----------|-------|--------|
| 1 | Visibility of System Status | 3 | = |
| 2 | Match System / Real World | 3 | = |
| 3 | User Control and Freedom | 3 | = (sortie réparée ; orphelin d'entrée découvert — corrigé en post-mesure) |
| 4 | Consistency and Standards | 3 | = |
| 5 | Error Prevention | 4 | = — confirmation destructive exemplaire |
| 6 | Recognition Rather Than Recall | 3 | = |
| 7 | Flexibility and Efficiency | 3 | = |
| 8 | Aesthetic and Minimalist Design | 3 | = |
| 9 | Error Recovery | 3 | = |
| 10 | Help and Documentation | 2 | = — front suivant |
| **Total** | | **30/40 (75 %)** | **Good — plateau structurel confirmé (29 → 30 → 30)** |

## Fixes micro-passe 8 : 3/3 prouvés

1. Refocus post-Cancel — vérifié live pas-à-pas (Cancel → focus « Import Backup » → Escape ferme)
2. --danger-dim rgba(220,38,38,0.08) tokenisé (2 thèmes) — computed style vérifié live
3. Pluriels FR _one sans interpolation (« TOUT votre diagramme ») — vérifié source

## Déterministe

CLI 0 ; runtime : delta zéro sur les deux vues (clipped ×7 structurels, cramped ×2, overused ×1, nested ×1, edge-flush ×1 artefact viewport ; skipped-heading ×1 vue 2) ; low-contrast 0, undersized 0 — stable sur 4 itérations.

## PARAGRAPHE PLATEAU (verdict A it.8)

« Les trois derniers passages ont produit +1, 0, 0, et chaque fix révèle désormais un défaut-miroir à la même altitude — la boucle fix-and-verify échange un contre un et ne peut plus produire de gain net. Le prochain front est H10 (aide & documentation, bloqué à 2/4 depuis trois itérations) : onboarding, guidance des états vides, aide contextuelle à la syntaxe Mermaid. Il dépasse la boucle parce qu'il est un travail génératif — contenu nouveau, flux nouveau, décisions éditoriales — et non correctif. Sans ouvrir ce front, la bande 30–32 est le plafond naturel de ce périmètre. »

## Post-mesure (non re-scored)

Fix one-liner du P2-miroir découvert par it.8 : focus sur Cancel à l'ENTRÉE de la confirmation (l'orphelin symétrique de la sortie). Gain attendu neutre (échange 1-pour-1 selon le verdict de plateau) — appliqué car le dialogue est le plus destructeur du produit et la correction tient en une ligne.

## Restant pour un futur milestone

- H10 : aide contextuelle (onboarding, guidance états vides, syntaxe Mermaid) — travail génératif
- Washes rouges brutes systémiques (~10 sites hors BackupPanel/Sidebar) — /impeccable extract
- Focus orphelin résiduels du même type sur d'autres flux — au fil des touches
