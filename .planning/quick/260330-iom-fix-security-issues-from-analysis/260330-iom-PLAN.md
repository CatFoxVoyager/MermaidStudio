---
phase: quick
plan: 260330-iom
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/ai/providers.ts
  - src/components/modals/tools/BackupPanel.tsx
  - src/components/modals/diagram/ExportModal.tsx
  - src/lib/mermaid/core.ts
  - src/utils/sanitization.ts
  - src/hooks/ai/useAISend.ts
  - vite.config.ts
autonomous: true
requirements: [S1, S4, S5, S8, Q1, P1]

must_haves:
  truths:
    - "Gemini API key is sent in x-goog-api-key header, never in URL query parameter"
    - "Backup import rejects prototype pollution keys, oversized payloads, and malformed diagram entries"
    - "Embed code CDN script has integrity hash and crossorigin attribute"
    - "Debug logs never contain raw user message content or API keys"
    - "Vite optimizeDeps.include contains only installed dependencies"
    - "Mermaid rendering and component previews continue to work with consolidated sanitization"
  artifacts:
    - path: "src/services/ai/providers.ts"
      provides: "Gemini fetch with header-based auth"
      contains: "x-goog-api-key"
    - path: "src/components/modals/tools/BackupPanel.tsx"
      provides: "Validated backup import"
      contains: "validateBackupData"
    - path: "src/components/modals/diagram/ExportModal.tsx"
      provides: "SRI-pinned CDN embed code"
      contains: "integrity"
    - path: "src/utils/sanitization.ts"
      provides: "Single source of truth for all sanitization configs"
      contains: "MERMAID_SVG_CONFIG"
    - path: "src/hooks/ai/useAISend.ts"
      provides: "Redacted debug logging"
      contains: "userMessageLength"
    - path: "vite.config.ts"
      provides: "Clean optimizeDeps"
  key_links:
    - from: "src/utils/sanitization.ts"
      to: "src/lib/mermaid/core.ts"
      via: "export of MERMAID_SVG_CONFIG and sanitizeMermaidSVG"
      pattern: "import.*sanitization"
    - from: "src/components/modals/tools/BackupPanel.tsx"
      to: "src/utils/sanitization.ts"
      via: "import of validateBackupData"
      pattern: "import.*validateBackupData"
    - from: "src/services/ai/providers.ts"
      to: "Gemini API"
      via: "x-goog-api-key header"
      pattern: "x-goog-api-key"
---

<objective>
Fix 6 security issues identified in code analysis, prioritized by severity.

Purpose: Eliminate API key exposure in URLs, validate backup imports against malicious payloads, pin CDN resources with SRI, redact sensitive data from debug logs, clean stale Vite config, and consolidate dual sanitization configurations into a single source of truth.

Output: All 6 issues resolved across 7 files.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/services/ai/providers.ts
@src/components/modals/tools/BackupPanel.tsx
@src/components/modals/diagram/ExportModal.tsx
@src/utils/sanitization.ts
@src/lib/mermaid/core.ts
@src/hooks/ai/useAISend.ts
@vite.config.ts

<interfaces>
From src/types/ui.ts:
```typescript
export interface BackupData {
  version: number;
  exported_at: string;
  folders: import('./storage').Folder[];
  diagrams: import('./storage').Diagram[];
  versions: import('./storage').DiagramVersion[];
  tags: import('./storage').Tag[];
  diagramTags: { diagram_id: string; tag_id: string }[];
  userTemplates: UserTemplate[];
  settings?: AppSettings;
}
```

From src/types/storage.ts:
```typescript
export interface Diagram {
  id: string;
  title: string;
  content: string;
  themeId?: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}
```

Components importing sanitizeSVG from sanitization.ts: DiagramColorsPanel, ThemeEditorPanel, VisualEditorCanvas, TemplateLibrary, VersionHistory, FullscreenPreview, PreviewPanel -- all render sanitized SVG into the DOM.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix critical API key exposure, embed SRI, and clean vite config (S1, S5, P1)</name>
  <files>src/services/ai/providers.ts, src/components/modals/diagram/ExportModal.tsx, vite.config.ts</files>
  <action>
Three targeted fixes:

**S1 - Gemini API key in header (providers.ts):**
At line 143, the URL contains `?key=${apiKey}`. Fix:
1. Remove `?key=${apiKey}` from the URL. Change line 143 to: ``const url = `${base}${API_ENDPOINTS.GEMINI}/${model}:generateContent`;``
2. Add `'x-goog-api-key': apiKey` to the fetch headers on line 161 (alongside Content-Type).
3. The log redaction regex on line 157 (`url.replace(/\?key=[^&]+/, '?key=[REDACTED]')`) can now be simplified since the key is no longer in the URL. Replace the debug log url field with just `url` (no redaction needed).

**S5 - SRI on CDN embed (ExportModal.tsx):**
In the `copyEmbedCode` function (line 123-130), replace the script tag with a version-pinned URL and SRI:
1. Fetch the Mermaid 11.13.0 minified bundle and compute its sha384 hash. Run this command in bash: `curl -s https://cdn.jsdelivr.net/npm/mermaid@11.13.0/dist/mermaid.min.js | openssl dgst -sha384 -binary | openssl base64 -A`
2. Replace the script tag on line 127 with: `<script src="https://cdn.jsdelivr.net/npm/mermaid@11.13.0/dist/mermaid.min.js" integrity="sha384-{COMPUTED_HASH}" crossorigin="anonymous"></script>`

**P1 - Stale vite deps (vite.config.ts):**
On line 22, remove the entire `include: ['dayjs', '@braintree/sanitize-url']` line. Neither package is in package.json. After removal, the `optimizeDeps` section should only contain `exclude: ['lucide-react', 'mermaid']`.
  </action>
  <verify>
    <automated>cd D:/code/MermaidStudio && npx tsc --noEmit 2>&1 | tail -5 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - Gemini API key sent via x-goog-api-key header, not URL query param
    - Embed code script tag has integrity sha384 hash and crossorigin="anonymous"
    - vite.config.ts optimizeDeps.include removed entirely (no stale entries)
    - TypeScript compiles and build succeeds without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Add backup import validation and redact debug logs (S4, S8)</name>
  <files>src/utils/sanitization.ts, src/components/modals/tools/BackupPanel.tsx, src/hooks/ai/useAISend.ts</files>
  <action>
**S4 - Backup import validation:**

In `src/utils/sanitization.ts`, add these imports at the top:
```typescript
import type { BackupData } from '@/types';
```

Then add a new exported function `validateBackupData` after the existing `sanitizeSVG` function:

```typescript
const MAX_BACKUP_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_STRING_FIELD_LENGTH = 10000;
const PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];

export function validateBackupData(raw: unknown): BackupData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid backup: expected an object');
  }
  const data = raw as Record<string, unknown>;

  // Check for prototype pollution keys at top level
  for (const key of PROTOTYPE_POLLUTION_KEYS) {
    if (key in data) {
      throw new Error(`Invalid backup: contains disallowed key "${key}"`);
    }
  }

  // diagrams must be an array
  if (!Array.isArray(data.diagrams)) {
    throw new Error('Invalid backup: missing or invalid diagrams array');
  }

  // Validate each diagram entry
  for (let i = 0; i < data.diagrams.length; i++) {
    const d = data.diagrams[i] as Record<string, unknown>;
    if (!d || typeof d !== 'object') {
      throw new Error(`Invalid backup: diagrams[${i}] is not an object`);
    }
    for (const key of PROTOTYPE_POLLUTION_KEYS) {
      if (key in d) {
        throw new Error(`Invalid backup: diagrams[${i}] contains disallowed key "${key}"`);
      }
    }
    if (typeof d.id !== 'string' || d.id.length === 0 || d.id.length > MAX_STRING_FIELD_LENGTH) {
      throw new Error(`Invalid backup: diagrams[${i}].id is invalid`);
    }
    if (typeof d.title !== 'string' || d.title.length > MAX_STRING_FIELD_LENGTH) {
      throw new Error(`Invalid backup: diagrams[${i}].title is invalid`);
    }
    if (typeof d.content !== 'string' || d.content.length > MAX_BACKUP_SIZE) {
      throw new Error(`Invalid backup: diagrams[${i}].content is too large or missing`);
    }
  }

  // Validate optional array fields with same pollution checks
  for (const field of ['folders', 'versions', 'tags', 'diagramTags', 'userTemplates'] as const) {
    if (field in data && data[field] !== undefined) {
      if (!Array.isArray(data[field])) {
        throw new Error(`Invalid backup: ${field} must be an array`);
      }
      for (const entry of data[field] as Record<string, unknown>[]) {
        for (const key of PROTOTYPE_POLLUTION_KEYS) {
          if (key in entry) {
            throw new Error(`Invalid backup: ${field} entry contains disallowed key "${key}"`);
          }
        }
      }
    }
  }

  // Validate optional settings object
  if (data.settings !== undefined && data.settings !== null) {
    if (typeof data.settings !== 'object' || Array.isArray(data.settings)) {
      throw new Error('Invalid backup: settings must be an object');
    }
    for (const key of PROTOTYPE_POLLUTION_KEYS) {
      if (key in (data.settings as Record<string, unknown>)) {
        throw new Error('Invalid backup: settings contains disallowed key');
      }
    }
  }

  return data as unknown as BackupData;
}
```

In `src/components/modals/tools/BackupPanel.tsx`:
1. Add import: `import { validateBackupData } from '@/utils/sanitization';`
2. In `handleImport`, before the `reader.onload`, add a file size check: if `file.size > 10 * 1024 * 1024`, call `onImported(t('backup.invalidFile'))` and return.
3. In the `reader.onload` callback, replace the existing `!data.diagrams || !Array.isArray(data.diagrams)` check (lines 35-37) with:
   ```typescript
   let validated: BackupData;
   try {
     validated = validateBackupData(data);
   } catch (validationErr) {
     onImported(validationErr instanceof Error ? validationErr.message : t('backup.invalidFile'));
     return;
   }
   const result = await importBackup(validated);
   ```
   The rest of the callback (lines 40-45) stays the same, using `result` and `data.settings`.

**S8 - Redact debug logs (useAISend.ts):**
In the `log.debug('Sending AI request', {...})` block (lines 86-94):
1. Replace `userMessage: text` with `userMessageLength: text.length` -- never log the raw user message.
2. All other fields (provider, model, hasDiagram, diagramType, contentLength, messageCount) are safe -- they don't contain user content.

Also in `src/services/ai/providers.ts` line 131, the `lastUserMessage` field already truncates user content. Reduce the truncation from 100 to 50 chars and add an ellipsis indicator: change `.pop()?.content.substring(0, 100)` to `.pop()?.content.substring(0, 50) + '...'`. Wrap this in a ternary so if there is no user message it shows `'[none]'` instead of crashing.
  </action>
  <verify>
    <automated>cd D:/code/MermaidStudio && npx tsc --noEmit 2>&1 | tail -5 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - validateBackupData function exported from sanitization.ts with prototype pollution, size, and field-level checks
    - BackupPanel uses validateBackupData before importing, with 10MB file size pre-check
    - Debug logs in useAISend.ts never include raw user messages (only length)
    - providers.ts user message preview capped at 50 chars with truncation indicator
    - TypeScript compiles and build succeeds
  </done>
</task>

<task type="auto">
  <name>Task 3: Consolidate dual sanitization configs into single source of truth (Q1)</name>
  <files>src/utils/sanitization.ts, src/lib/mermaid/core.ts</files>
  <action>
**Q1 - Consolidate to single sanitization source:**

Currently two DOMPurify configs exist:
- `src/utils/sanitization.ts` uses `USE_PROFILES: { svg: true }` (permissive) -- used by 8+ components for preview rendering
- `src/lib/mermaid/core.ts` lines 21-66 use an explicit allowlist `SANITIZATION_CONFIG` (more restrictive) -- used for mermaid SVG output

Strategy -- make sanitization.ts the single source of truth:

**In `src/utils/sanitization.ts`:**
1. Add the restrictive config as an exported constant `MERMAID_SVG_CONFIG`. Copy the exact object from core.ts lines 21-66 (the one with `ALLOWED_TAGS`, `ALLOWED_ATTR`, `ALLOW_DATA_URI`, `ALLOW_UNKNOWN_ATTRS`).
2. Add a new exported function `sanitizeMermaidSVG` that uses this config:
   ```typescript
   export function sanitizeMermaidSVG(svg: string): string {
     return DOMPurify.sanitize(svg, MERMAID_SVG_CONFIG);
   }
   ```
3. Keep the existing `sanitizeSVG` function exactly as-is. It uses the permissive config intentionally for component preview rendering. Do NOT change it.

**In `src/lib/mermaid/core.ts`:**
1. Remove the `import DOMPurify from 'dompurify';` line (line 3)
2. Remove the entire `SANITIZATION_CONFIG` constant (lines 21-66)
3. Add import: `import { sanitizeMermaidSVG } from '@/utils/sanitization';`
4. On line 201, replace `DOMPurify.sanitize(svg, SANITIZATION_CONFIG)` with `sanitizeMermaidSVG(svg)`

Result: core.ts no longer imports DOMPurify directly and no longer contains an inline config. All DOMPurify usage goes through sanitization.ts.
  </action>
  <verify>
    <automated>cd D:/code/MermaidStudio && npx tsc --noEmit 2>&1 | tail -5 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - MERMAID_SVG_CONFIG (restrictive allowlist) exported from src/utils/sanitization.ts
    - sanitizeMermaidSVG function exported from sanitization.ts
    - src/lib/mermaid/core.ts no longer imports DOMPurify directly
    - src/lib/mermaid/core.ts no longer contains an inline SANITIZATION_CONFIG
    - All 8+ components importing sanitizeSVG continue to work unchanged
    - TypeScript compiles and build succeeds
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. `npm run build` succeeds
3. No `?key=` in providers.ts Gemini URL (grep check)
4. `integrity` attribute present in ExportModal.tsx embed code
5. No `userMessage:` field in useAISend.ts logs (replaced with `userMessageLength`)
6. No `DOMPurify` import in core.ts (consolidated to sanitization.ts)
7. No `dayjs` or `@braintree/sanitize-url` in vite.config.ts
</verification>

<success_criteria>
- Gemini API key never appears in URL query parameter (sent via x-goog-api-key header)
- Backup import validates against prototype pollution, oversized payloads, and malformed entries
- Embed code CDN script has integrity hash and crossorigin attribute
- Debug logs never contain raw user message content
- Vite optimizeDeps.include has no stale dependency references
- Single source of truth for all DOMPurify configurations in src/utils/sanitization.ts
- All TypeScript compiles and build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/260330-iom-fix-security-issues-from-analysis/260330-iom-SUMMARY.md`
</output>
