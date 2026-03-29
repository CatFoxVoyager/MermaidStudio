# Deferred Items from Phase 02 Wave 0

## Pre-existing Test Failures

The following test failures were identified during Wave 0 execution but are **out of scope** for this plan. These issues existed before Wave 0 and should be addressed in separate plans.

### 1. AppLayout.test.tsx - Missing Test IDs

**File:** `src/components/__tests__/AppLayout.test.tsx`
**Failures:** 3 tests failing
**Error:** `TestingLibraryElementError: Unable to find an element with the testid: "advanced-style"`

**Tests failing:**
- should render AdvancedStylePanel when showAdvancedStyle is true
- should call onCloseAdvancedStyle when close button clicked
- should call handleSave when save button clicked

**Root cause:** The AdvancedStylePanel component does not have `data-testid="advanced-style"` attribute.

**Recommended fix:** Add `data-testid="advanced-style"` to the root element of AdvancedStylePanel component.

**Priority:** Medium - Not blocking Wave 1 refactoring, but should be fixed for complete test coverage.

### 2. database.test.ts - Base Theme Frontmatter Expectation

**File:** `src/services/storage/__tests__/database.test.ts`
**Failures:** 2 tests failing
**Error:** Expected diagram content to contain '---' (frontmatter delimiter)

**Tests failing:**
- should create diagrams asynchronously with base theme by default
- should create diagram with unique ID and base theme by default

**Root cause:** Test expectations don't match implementation. The `createDiagram` function in `database.ts` was changed to NOT include base theme frontmatter in default content (line 285 comment: "Don't add theme: base frontmatter - let templates use Mermaid's default theme").

**Test expectation:**
```typescript
expect(diagram.content).toContain('---');
expect(diagram.content).toContain('config:');
expect(diagram.content).toContain('theme: base');
```

**Actual implementation:**
```typescript
const d: Diagram = {
  id: uid(),
  title,
  content, // No frontmatter added
  folder_id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

**Recommended fix:** Update test expectations to NOT expect base theme frontmatter, or revert the implementation change if frontmatter was intended.

**Priority:** Low - Implementation appears intentional (comment explicitly states this decision), tests just need updating.

## When to Fix These Issues

These deferred items should be addressed in one of the following ways:

1. **Quick fixes plan:** Create a separate plan to fix these test failures before Wave 1 begins
2. **During Wave 1:** Fix as part of App.tsx refactoring (for AppLayout.test.tsx issues)
3. **Post-refactoring:** Address after all waves complete as part of test coverage improvement

**Recommendation:** Fix AppLayout.test.tsx issues during Wave 1A (Extract hooks from App.tsx) since they're related to the AppLayout component. Fix database.test.ts expectations as a separate quick task.
