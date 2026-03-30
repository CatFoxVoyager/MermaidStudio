---
phase: 02-fix-technical-debt-split-god-classes-fix-tests-improve-coverage
plan: 06
type: execute
wave: 5
subsystem: Test Infrastructure
tags: [testing, coverage, playwright, vitest, gap-closure]
key_files:
  created:
    - src/hooks/__tests__/useLanguage.test.ts
    - src/utils/__tests__/sanitization.test.ts
    - playwright.config.ts
  modified:
    - vitest.config.ts
  deleted:
    - playwright.config.cjs
decisions: []
metrics:
  duration: "5 minutes"
  completed_date: "2026-03-30T10:35:00Z"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  files_deleted: 1
---

# Phase 02 Plan 06: Final Gap Closure Summary

## One-Liner
Finalized Phase 02 gap closure by adding 18 quick-win tests for useLanguage hook and sanitization utility, lowering vitest coverage thresholds to realistic levels (65/64/59/62), and converting Playwright config from CommonJS to TypeScript.

## Objective Completion

### Primary Goals
- ✅ **Quick-win tests added**: Created test coverage for two small, previously uncovered modules (useLanguage.ts at 0%, sanitization.ts at 0%)
- ✅ **Vitest thresholds adjusted**: Lowered coverage thresholds from aspirational 75/75/70/75 to realistic 65/64/59/62 based on actual codebase composition
- ✅ **Playwright config modernized**: Converted from CommonJS (.cjs) to TypeScript (.ts) format
- ✅ **All tests passing**: 876 tests passing across 41 test files

### Acceptance Criteria Met
- ✅ useLanguage.test.ts exists with 7 tests (exceeds requirement of 5+)
- ✅ sanitization.test.ts exists with 11 tests (exceeds requirement of 4+)
- ✅ Vitest thresholds lowered to lines: 65, functions: 64, branches: 59, statements: 62
- ✅ playwright.config.ts exists with TypeScript import syntax
- ✅ playwright.config.cjs deleted
- ✅ Full test suite passes with 0 failures (876/876 tests)

## Deviations from Plan

### None - Plan Executed Exactly as Written

All tasks completed as specified without deviations or unexpected issues.

## Implementation Details

### Task 1: Quick-Win Tests

**useLanguage.test.ts** (7 tests):
- Initialization with default 'en' language
- Initialization with stored language from settings
- setLanguage() updates language state
- setLanguage() calls updateSettings
- toggle() switches between 'en' and 'fr'
- Guard behavior: no i18n.changeLanguage before initialization
- i18n.changeLanguage called after language changes

**sanitization.test.ts** (11 tests):
- Returns sanitized output from DOMPurify.sanitize
- Handles empty strings
- Handles strings with special characters
- Calls DOMPurify.sanitize with USE_PROFILES.svg: true
- Calls with ADD_TAGS including foreignObject, div, span
- Calls with ADD_ATTR including data-rendered, data-testid
- Allows foreignObject elements
- Allows iframe elements
- Allows standard HTML inside foreignObject
- Preserves data-rendered attribute
- Preserves data-testid attribute

### Task 2: Threshold Adjustment & Playwright Config

**Vitest Thresholds Rationale**:
The plan correctly identified that two rounds of gap closure (02-04, 02-05) yielded diminishing returns: 30 new tests for only +0.82% overall coverage. The coverage gap (64.98% vs 75% target) stems from:
- Legacy UI components: PreviewPanel (31%), ColorPicker (37%)
- Large Mermaid utilities: codeUtils (58%), autocomplete (15%)

Lowering thresholds to 65/64/59/62 reflects the reality that achieving 75% coverage would require ~150+ tests on legacy components with disproportionate effort.

**Playwright Config Conversion**:
- Converted from `module.exports = defineConfig({...})` to `export default defineConfig({...})`
- Changed `const { defineConfig, devices } = require('@playwright/test')` to `import { defineConfig, devices } from '@playwright/test'`
- All configuration values preserved identically
- Validated with `npx playwright test --list` - all 25 E2E tests listed successfully

## Technical Context

### Why This Plan Was Necessary

Phase 02's primary goals (god class refactoring, test infrastructure, critical path coverage) were all achieved by plan 02-05. However, coverage thresholds remained at aspirational 75% levels that the actual codebase composition could not achieve without disproportionate investment in legacy UI component tests.

This plan accepts reality and adjusts thresholds rather than fighting diminishing returns, completing Phase 02 on a pragmatic note.

### Test Infrastructure State

**Before Plan 02-06**:
- 858 tests passing (41 test files)
- Coverage thresholds: 75/75/70/75 (aspirational)
- Playwright config: CommonJS (.cjs)
- Uncovered modules: useLanguage (0%), sanitization (0%)

**After Plan 02-06**:
- 876 tests passing (41 test files) - +18 tests
- Coverage thresholds: 65/64/59/62 (realistic)
- Playwright config: TypeScript (.ts)
- Uncovered modules: None (quick wins addressed)

## Phase 02 Completion

This plan completes Phase 02: Fix technical debt - split god classes, fix tests, improve coverage.

**Phase 02 Achievements**:
- ✅ God classes refactored (AIPanel, Tabs, VisualEditor)
- ✅ Test infrastructure fixed and expanded
- ✅ Critical paths covered at 75-100%
- ✅ Coverage thresholds set to realistic levels
- ✅ Quick-win tests added for small modules
- ✅ Playwright config modernized to TypeScript

## Files Changed

### Created
- `src/hooks/__tests__/useLanguage.test.ts` (162 lines) - Tests for useLanguage hook
- `src/utils/__tests__/sanitization.test.ts` (144 lines) - Tests for sanitizeSVG utility
- `playwright.config.ts` (36 lines) - TypeScript Playwright configuration

### Modified
- `vitest.config.ts` - Adjusted coverage thresholds from 75/75/70/75 to 65/64/59/62

### Deleted
- `playwright.config.cjs` - Old CommonJS Playwright configuration

## Commits

1. **test(02-06): add quick-win tests for useLanguage and sanitization** (6c532bc)
   - Added useLanguage.test.ts with 7 tests
   - Added sanitization.test.ts with 11 tests
   - All tests passing (18 tests total)

2. **feat(02-06): adjust vitest thresholds and convert Playwright config to TypeScript** (974671c)
   - Lowered vitest coverage thresholds to realistic levels
   - Converted playwright.config.cjs to playwright.config.ts
   - Validated Playwright config with npx playwright test --list

## Self-Check: PASSED

- ✅ All created files exist on disk
- ✅ Both commits exist in git log
- ✅ All acceptance criteria met
- ✅ Test counts exceed requirements (7 vs 5, 11 vs 4)
- ✅ Full test suite passes (876/876 tests)
- ✅ Vitest thresholds correctly lowered
- ✅ Playwright config successfully converted
- ✅ No deviations from plan
- ✅ Phase 02 can be marked complete

## Known Stubs

None - All deliverables are fully functional with no placeholder code.
