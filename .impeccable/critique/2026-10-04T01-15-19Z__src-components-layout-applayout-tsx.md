---
target: workspace desktop principal (AppLayout)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
target_fingerprint: "sha256:62f015fd19e004734a7a23e80adea51673cb95b0b54d131e99e5eca38c95fb9c"
target_path: "D:\\code\\MermaidStudio\\src\\components\\layout\\AppLayout.tsx"
timestamp: 2026-10-04T01-15-19Z
slug: src-components-layout-applayout-tsx
---
# Critique — workspace desktop MermaidStudio (itération 2)

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
| **Total** | | **25/40** | **23 → 25 (+2) — gains réels, plafonné par l'a11y résiduelle** |

## Design Specificity Verdict

**LLM** : Spécifique et ancré — 4/5. Les fixes ne sont pas des palliatifs génériques : « Edited · autosaved » est fondé sur l'architecture réelle (save débouncé vérifié dans useTabs), la modale folder décrit exactement la sémantique de deleteFolder (re-parenting vérifié), le token --hover est décliné par thème. Reste générique : le pattern focus-reveal s'est arrêté à la sidebar sans balayer la TabBar.

**Déterministe** : CLI 0 finding (stable). Runtime : **undersized-ui-text 25 → 0** (plancher 11px confirmé), **low-contrast 2 → 0** (passation du token prouvée vivante via l'API dédiée), aucune régression. Restants : clipped ×7 (coquilles structurelles = faux positifs), edge-flush ×1 (canvas), overused-font (info), cramped-padding ×1 (attribution faible).

## Fixes itération 1 — statut live

7/8 confirmés intégralement (modale véridique avec role/Escape/focus, plancher 11px, statut EN+FR, toolbar distillée + Collapse persisté, hover token mesuré, menu langue dismissable, contraste secondary). Résidus détectés : kbd 10px (index.css), active:bg-white/15, bouton fermer d'onglet sans focus-reveal (TabBar), --text-tertiary sous AA, html lang="en" en UI française, « Saved Nm ago » fabriqué.

## Priority Issues

- **[P1] Boutons icon-only sans nom accessible** — title seul sur ToolbarButton, toggles TopBar, entêtes sidebar, zooms preview ; l'a11y ne doit pas dépendre du survol. Fix : aria-label={title ?? label} dans ToolbarButton + balayage. *Commande : harden*
- **[P1] Bouton fermer d'onglet invisible au focus** — TabBar.tsx:38 : opacity-0 sans variante focus (mesuré opacity 0 pendant le focus). Fix : group-focus-within + focus-visible. *Commande : harden*
- **[P2] html lang ne suit pas la langue UI** — lang="en" mesuré avec l'UI en français ; les SR lisent le français à l'anglaise. Fix : synchroniser document.documentElement.lang. *Commande : harden*
- **[P2] « Saved Nm ago » fabriqué à l'état clean** — lastSaved = new Date() au render ; N = durée depuis le mount. L'honnêteté ne doit pas être directionnelle. Fix : vrai timestamp du save débouncé, sinon « Autosaved » sans temps. *Commande : clarify*
- **[P2] --text-tertiary sous AA** — ≈4.0:1 light / 3.8:1 dark pour la status bar 12px. Fix : assombrir/éclaircir le token. *Commande : colorize*
- **[P3 groupés]** : modales divergentes (click-outside, scrim, autofocus) ; « Its 0 diagram(s) » pluralisation ; kbd 10px ; active:bg-white/15 résiduel ; bannière offline morte (providers inexistants) ; ContextMenu danger text-red-400 ≈3:1 ; preview clippe son bouton Export à 1440px ; nœuds crème sur dark.

## Persona Red Flags

**Alex** : chasse au survol pour 10 icônes ; « Auto-snapshot » ambigu vs autosave réel. **Sam** : cluster d'icônes sans libellé au premier jour ; modale delete = meilleur flux pour un novice. **Riley (a11y)** : accumulation — boutons sans nom accessible, focus invisible TabBar, lang="en", « Close modal » non traduit, tertiary sous AA — Riley paie tous les résidus.

## Questions to Consider

1. Si la toolbar a besoin d'un bouton « Collapse », n'est-ce pas la preuve que Colors, Advanced, Fullscreen, Reset split devraient vivre dans les panneaux qu'ils ouvrent ?
2. « Edited · autosaved » dit la vérité — pourquoi l'état clean a-t-il le droit d'inventer un timestamp ?
3. Un SR francophone peut-il deviner que l'app est bilingue, avec lang="en" et « Close modal » ?
