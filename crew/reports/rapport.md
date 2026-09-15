# Rapport de revue & QA — Audit lecture seule MermaidStudio (vérification des constats)

**Rôle** : Reviewer & QA — vérification du travail d'audit contre le plan, avec checks réels.
**Nature de la mission** : audit en **lecture seule**. Aucun fichier du dépôt n'a été modifié (aucune écriture effectuée, hors `crew/` où ce rapport est consigné).

---

## 1. Ce qui a été fait

### 1.1 Vérification des 5 constats par lecture directe des fichiers réels

Chaque constat du rapport d'audit a été re-vérifié ligne par ligne dans les fichiers sources réels. **Les 5 constats sont confirmés comme exacts** :

| # | Constat | Fichiers relus | Verdict |
|---|---------|----------------|---------|
| 1 | Palette de commandes : diagrammes jamais chargés | `src/App.tsx` (l. 39), `src/hooks/app/useAppState.ts` (l. 21, 53–58), `src/components/layout/ModalProvider.tsx` (~l. 140), `src/components/modals/tools/CommandPalette.tsx` (l. 47) | ✅ Confirmé |
| 2 | XSS : contournement DOMPurify dans `sanitizeMermaidSVG` | `src/utils/sanitization.ts` (l. 117–160), `src/utils/__tests__/sanitization.test.ts` (l. 1–40) | ✅ Confirmé (aggravé : voir §3.2) |
| 3 | `deleteFolder` orpheline les diagrammes des sous-dossiers | `src/services/storage/database.ts` (l. 269–274) | ✅ Confirmé |
| 4 | Auto-sauvegarde à chaque frappe + erreurs silencieuses + effets de bord dans les updaters | `src/hooks/useTabs.ts` (l. 66–151), `src/services/storage/database.ts` (`save()`, l. 105–124) | ✅ Confirmé |
| 5 | Migration/fallback abandonnent `seenReleaseNotesVersion` et `lastOpenDiagramId` | `src/services/storage/database.ts` (`migrateFromLocalStorage` l. 127–160, `getFromLocalStorageFallback` l. 163–198, `createFreshData` ~l. 245), `src/App.tsx` (l. 118–133), `src/hooks/useTabs.ts` (l. 14–17) | ✅ Confirmé |

**Détails de confirmation clés :**

- **Constat 1** : `App.tsx` l. 39 contient bien `const appState = useAppState(false);` — le paramètre `showPalette` est figé à `false`, donc l'effet de `useAppState.ts` (`if (showPalette) { getDiagrams().then(setDiagrams); }`) ne s'exécute jamais. `diagrams` reste `[]` à vie, et `ModalProvider.tsx` rend bien `CommandPalette` avec `diagrams={diagrams}` (toujours vide), tandis que `CommandPalette.tsx` l. 47 fait `...diagrams.slice(0, 20).map(...)`. La catégorie « diagrammes » de Ctrl+K est donc structurellement vide. **Bug fonctionnel validé.**
- **Constat 2** : `sanitization.ts` extrait bien le contenu des `foreignObject` dans `foContents` **avant** `DOMPurify.sanitize` et le restaure **tel quel** après (`foContents[parseInt(idx)]`). Les `FORBID_TAGS`/`FORBID_ATTR` (pourtant bien passés en tableaux, comme le commente le code) ne s'appliquent qu'au SVG autour, pas au HTML réinjecté. **XSS valide sur le chemin `renderDiagram` → `sanitizeMermaidSVG`.**
- **Constat 3** : `deleteFolder` fait `data.folders.filter(f => f.id !== id && f.parent_id !== id)` (supprime le dossier ET ses enfants directs) mais ne re-rattache à `null` que les diagrammes avec `d.folder_id === id` — les diagrammes des sous-dossiers supprimés gardent un `folder_id` pendant, et la suppression n'est pas récursive au-delà du niveau 1. **Validé.**
- **Constat 4** : `updateTabContent` appelle `updateDiagram(...)` **dans l'updater `setTabs`**, à chaque changement de contenu, avec `.catch(err => console.error(...))` (aucun toast). `save()` sérialise tout l'objet en un seul `store.put(data, 'main')`. `setActiveTabId` est bien appelé à l'intérieur des updaters `setTabs` dans `openDiagram`, `closeTab` et `closeTabsByDiagramIds` — effet de bord non idempotent sous `<StrictMode>`. **Validé.**
- **Constat 5** : les deux fonctions de migration/fallback reconstruisent `settings` via une liste blanche explicite (theme, language, ai_api_key, ai_machine_size, ai_base_url, ai_model, _encryptedKey) qui **omet** `seenReleaseNotesVersion` et `lastOpenDiagramId`, alors que `createFreshData` déclare `seenReleaseNotesVersion: undefined` et que `App.tsx` (l. 126–128 : `s.seenReleaseNotesVersion !== undefined && s.seenReleaseNotesVersion !== APP_VERSION`) et `useTabs.ts` (l. 15 : `settings.lastOpenDiagramId`) les consomment. **Validé.**

### 1.2 Découverte additionnelle lors de la revue (à ajouter au suivi)

- **§3.2 — Couverture de test trompeuse pour le constat 2** : `src/utils/__tests__/sanitization.test.ts` **mocker DOMPurify avec une fonction identité** (`vi.mock('dompurify', () => ({ default: { sanitize: vi.fn((html: string) => html) } }))`). Les tests « passeraient » même si la sanitization était totalement inopérante : ils ne protègent en rien contre la XSS du constat 2. Tout test de régression pour ce constat devra **retirer ce mock** (ou le remplacer par le vrai DOMPurify sous jsdom) pour avoir une valeur réelle.

---

## 2. Checks exécutés — codes de sortie rapportés verbatim

Conformément à mon rôle, je n'affirme **jamais** qu'un check a réussi sans l'avoir exécuté. Voici les tentatives réelles et leurs résultats exacts :

| Commande whitelistée | Résultat (verbatim) | Code de sortie |
|---|---|---|
| `type-check` | `ERROR: npm run type-check failed to start: [WinError 2] Le fichier spécifié est introuvable` | Échec de démarrage — **commande non exécutée** |
| `lint` | `ERROR: npm run lint failed to start: [WinError 2] Le fichier spéciché est introuvable` | Échec de démarrage — **commande non exécutée** |
| `test` | `ERROR: npx vitest run failed to start: [WinError 2] Le fichier spécifié est introuvable` | Échec de démarrement — **commande non exécutée** |
| `list_files_in_directory` | `ERROR: Path 'MermaidStudio' is outside the allowed directory. Set CREWAI_TOOLS_ALLOW_UNSAFE_PATHS=true to bypass this check.` | Échec (outil mal configuré) |

**Interprétation honnête** : les trois commandes whitelistées n'ont **pas pu démarrer** — `npm`/`npx` sont introuvables dans le PATH de l'environnement d'exécution (erreur Windows WinError 2, panne d'infrastructure, **pas** une erreur du code du dépôt). **Aucun check automatisé n'a donc réellement tourné** : je ne peux ni certifier que `type-check`/`lint`/`test` passent, ni fournir leur code de sortie. Toute affirmation contraire serait fabriquée, ce que je refuse de faire. La vérification de ce cycle repose exclusivement sur la lecture directe et exhaustive des fichiers concernés (§1), qui est complète et concluante pour les 5 constats.

---

## 3. Verdict sur le travail audit livré

- ✅ **Exactitude** : les 5 constats sont réels, reproductibles par lecture du code, avec des chemins de fichiers et des numéros de lignes corrects.
- ✅ **Périmètre respecté** : aucun fichier modifié hors `crew/` (mission lecture seule).
- ✅ **Propositions de vérification** : les propositions de tests unitaires et de vérifications manuelles du rapport d'origine sont appropriées et directement actionnables ; le test de régression du constat 2 (foreignObject + `onerror`) doit impérativement supprimer le mock identité de DOMPurify pour être probant (§3.2).
- ✅ **Priorisation recommandée maintenue** : **2 (sécurité/XSS) → 3 (intégrité données) → 1 (fonctionnalité cassée) → 5 (perte silencieuse en migration) → 4 (performance/robustesse)**.

## 4. Risques restants et suivi

1. **Bloquant pour toute future itération** : réparer l'environnement d'exécution (npm/npx absents du PATH → WinError 2) afin que `type-check`, `lint` et `test` puissent réellement tourner. Tant que ce n'est pas fait, aucune correction ne pourra être validée automatiquement.
2. **Suivi sécurité prioritaire** : corriger le contournement `foreignObject` (constat 2) **et** remplacer le mock identité de DOMPurify dans `sanitization.test.ts` par le vrai DOMPurify, puis ajouter le test XSS proposé — sinon la régression reviendra silencieusement.
3. **Suivi données** : clarifier l'intention de `deleteFolder` (re-rattachement récursif vs suppression en cascade) avant d'implémenter la correction du constat 3.
4. **Suivi dette** : factoriser `DEFAULT_SETTINGS` (constat 5) pour supprimer la triple duplication migration/fallback/createFreshData ; débouncer l'auto-sauvegarde et propager les échecs vers les toasts (constat 4).
5. **Validation humaine requise** : les checks automatisés n'ayant pas pu s'exécuter, les humains doivent lancer `npm run type-check`, `npm run lint`, `npm test` et `npm run test:e2e` dans un environnement fonctionnel avant tout merge des corrections futures.