# Quick Task 260330-iom: Fix security issues from analysis

**Date:** 2026-03-30
**Status:** Complete
**Commit:** 2b3c9d6

## Summary

Fixed 6 security issues identified during comprehensive code analysis.

## Changes Made

### S1 (CRITICAL): Gemini API Key in URL Query Parameter
- **File:** `src/services/ai/providers.ts`
- **Change:** Moved API key from `?key=` URL parameter to `x-goog-api-key` header
- **Impact:** Key no longer visible in browser history, server logs, cache, or referrer headers

### S4 (MEDIUM): Backup Import Validation
- **File:** `src/utils/sanitization.ts`, `src/components/modals/tools/BackupPanel.tsx`
- **Change:** Added `validateBackupData()` function with prototype pollution checks, size limits, and field-level validation
- **Impact:** Malicious backup files can no longer inject `__proto__`/`constructor`/`prototype` keys or oversized payloads

### S5 (MEDIUM): CDN Embed Without SRI
- **File:** `src/components/modals/diagram/ExportModal.tsx`
- **Change:** Pinned CDN script to mermaid v11 and added `integrity` sha384 hash + `crossorigin="anonymous"`
- **Impact:** CDN compromise can no longer serve malicious JS

### S8 (LOW): API Key in Debug Logs
- **File:** `src/hooks/ai/useAISend.ts`, `src/services/ai/providers.ts`
- **Change:** Replaced `userMessage: text` with `userMessageLength: text.length`; truncated message preview to 50 chars
- **Impact:** Raw user messages (potentially containing API keys) no longer logged

### Q1 (MEDIUM): Dual Sanitization Configs
- **Files:** `src/utils/sanitization.ts`, `src/lib/mermaid/core.ts`
- **Change:** Consolidated both DOMPurify configs into `sanitization.ts` (single source of truth); `core.ts` now imports `sanitizeMermaidSVG()`
- **Impact:** Eliminates config drift risk; all sanitization goes through one module

### P1 (LOW): Stale Vite Dependencies
- **File:** `vite.config.ts`
- **Change:** Removed `dayjs` and `@braintree/sanitize-url` from `optimizeDeps.include`
- **Impact:** Cleaner build config, no phantom dependency references

## Verification

- TypeScript compiles with zero errors (`npx tsc --noEmit`)
- Production build succeeds (`npm run build`)
- No `?key=` in any Gemini URL (grep verified)
- `userMessageLength` replaces `userMessage` in useAISend.ts
- No direct `DOMPurify` import in core.ts (consolidated to sanitization.ts)
