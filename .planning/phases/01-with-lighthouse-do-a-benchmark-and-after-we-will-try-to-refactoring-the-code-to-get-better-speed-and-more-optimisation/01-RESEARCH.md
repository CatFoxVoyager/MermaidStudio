# Phase 1: With lighthouse, do a benchmark, and after we will try to refactoring the code to get better speed and more optimisation - Research

**Researched:** 2026-03-29
**Domain:** Performance Optimization & Lighthouse Benchmarking
**Confidence:** HIGH

## Summary

This research focuses on establishing a performance benchmarking baseline using Lighthouse for MermaidStudio, a React + TypeScript + Vite diagram editor application. The current build shows a 5.2MB dist folder with significant bundle sizes (1.4MB render.js, 1MB index.js), indicating optimization opportunities. The phase requires implementing Lighthouse CI/CLI integration, measuring Core Web Vitals, and identifying performance bottlenecks specific to diagram editing applications.

**Primary recommendation:** Implement Lighthouse CI for automated performance tracking, starting with baseline measurements on the main diagram editor workflow, followed by targeted optimization of large Mermaid.js bundles and React render patterns.

## 1. Domain Understanding

### 1.1 Current Project State

**Technology Stack:**
- React 19.2.4 with TypeScript
- Vite 8.0.2 build system
- Mermaid 11.13.0 (diagram rendering)
- CodeMirror 6 (code editor)
- IndexedDB for storage
- 4,244 lines of TypeScript/TSX code

**Current Build Analysis:**
```
Total build size: 5.2MB
Largest bundles:
- render-TAZW7USW-BlhPrXFb.js: 1.4MB
- index-B_lfuYYH.js: 1.0MB
- chunk-XZSTWKYB-xFFCz_EK.js: 427KB
- cytoscape.esm-DYrEXO6P.js: 424KB
- katex-BgAh0nbH.js: 251KB
```

**Performance Concerns Identified:**
1. Large Mermaid diagram type bundles (architectureDiagram: 144KB, sequenceDiagram: 108KB)
2. Multiple diagram types loaded even when unused
3. No code splitting implemented
4. No lazy loading for diagram types
5. Render component is 1.4MB (likely includes all Mermaid modules)

### 1.2 Application Performance Profile

**Critical User Flows to Benchmark:**
1. **Initial page load** - First paint, interactive time
2. **Creating new diagram** - Time from click to editable state
3. **Switching diagram types** - Re-render performance
4. **Large diagram rendering** - Complex flowchart/graph rendering
5. **AI panel interactions** - Chat interface responsiveness
6. **Code editor input** - Typing latency, syntax highlighting

**Performance-Sensitive Components:**
- `PreviewPanel` - Mermaid rendering (performance-critical)
- `CodeEditor` - CodeMirror 6 initialization
- `AIPanel` - Streaming responses
- `NodeStylePanel` - Real-time style updates
- Diagram type switchers - Bundle loading

## 2. Technical Approaches

### 2.1 Lighthouse Integration Strategies

#### Option A: Lighthouse CI (Recommended for CI/CD)

**What:** Automated Lighthouse testing in CI pipelines with performance regression detection

**When to use:** Continuous performance monitoring, PR performance checks

**Installation:**
```bash
npm install -D @lhci/cli
```

**Configuration (.lighthouserc.json):**
```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "url": ["http://localhost:5173"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        "categories:accessibility": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**Benefits:**
- Automated performance regression detection
- GitHub Actions integration
- Historical performance tracking
- Budget assertions (bundle size, metrics)

**Tradeoffs:**
- Requires CI infrastructure setup
- More complex initial setup
- Best for teams with CI/CD pipeline

#### Option B: Lighthouse CLI (Recommended for Local Development)

**What:** Command-line Lighthouse for ad-hoc performance testing

**When to use:** Local development, quick performance checks

**Installation:**
```bash
npm install -D lighthouse
```

**Usage:**
```bash
# Run Lighthouse on localhost
npx lighthouse http://localhost:5173 --output html --output-path ./lighthouse-report.html

# Run only performance category
npx lighthouse http://localhost:5173 --only-categories=performance

# Headless mode for CI
npx lighthouse http://localhost:5173 --chrome-flags="--headless" --output json

# With specific form factor
npx lighthouse http://localhost:5173 --form-factor=desktop
```

**Benefits:**
- Simple setup
- Great for development workflow
- No CI required
- Quick feedback

**Tradeoffs:**
- No automated regression detection
- Manual process
- No historical tracking

#### Option C: Lighthouse Node Module (Recommended for Custom Integration)

**What:** Programmatic Lighthouse execution for custom testing scenarios

**When to use:** Custom test flows, multiple page testing, conditional testing

**Example:**
```typescript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function runLighthouse(url: string) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = { logLevel: 'info', output: 'json', port: chrome.port };
  const runnerResult = await lighthouse(url, options);
  await chrome.kill();
  return runnerResult.lhr;
}
```

**Benefits:**
- Full programmatic control
- Can test multiple scenarios
- Custom assertions
- Integration with existing test suite

**Tradeoffs:**
- Requires more code
- More complex setup

### 2.2 Performance Metrics to Track

#### Core Web Vitals (Critical)

| Metric | Full Name | Good Threshold | Needs Improvement | Poor |
|--------|-----------|----------------|-------------------|------|
| **LCP** | Largest Contentful Paint | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **FID** | First Input Delay | < 100ms | 100ms - 300ms | > 300ms |
| **CLS** | Cumulative Layout Shift | < 0.1 | 0.1 - 0.25 | > 0.25 |

#### Other Key Metrics

| Metric | Full Name | Good Threshold | Importance |
|--------|-----------|----------------|------------|
| **FCP** | First Contentful Paint | < 1.8s | First visual feedback |
| **TTI** | Time to Interactive | < 3.8s | Page fully interactive |
| **TBT** | Total Blocking Time | < 200ms | Main thread blocking |
| **SI** | Speed Index | < 3.4s | Visual loading progress |
| **TTFB** | Time to First Byte | < 600ms | Server response time |

#### Application-Specific Metrics

**For MermaidStudio:**
- **Time to first diagram render** - Diagram appears in preview
- **Time to interactive editor** - User can type in CodeMirror
- **Time to switch diagram types** - Diagram type change complete
- **Time to AI response** - Streaming appears
- **Bundle load time** - Initial JS bundles downloaded
- **Diagram type bundle load** - Lazy-loaded diagram type chunks

## 3. Tools & Libraries

### 3.1 Core Performance Tools

#### Lighthouse Ecosystem

| Tool | Purpose | Use Case |
|------|---------|----------|
| **lighthouse** (CLI) | Manual performance audits | Local development |
| **@lhci/cli** | CI/CD integration | Automated testing |
| **chrome-launcher** | Programmatic Chrome control | Custom test scenarios |

**Installation:**
```bash
# For local development
npm install -D lighthouse

# For CI/CD
npm install -D @lhci/cli

# For programmatic use
npm install -D lighthouse chrome-launcher
```

**Version verification:**
```bash
npm view lighthouse version
# Current: 11.7.1 (as of March 2026)

npm view @lhci/cli version
# Current: 0.13.0 (as of March 2026)
```

#### Bundle Analysis Tools

| Tool | Purpose | Why Use |
|------|---------|---------|
| **rollup-plugin-visualizer** | Visualize bundle composition | Identify large dependencies |
| **vite-plugin-inspect** | Inspect Vite transformations | Debug plugin behavior |
| **webpack-bundle-analyzer** | Bundle size analysis | Compare bundle sizes |

**Installation:**
```bash
npm install -D rollup-plugin-visualizer
npm install -D vite-plugin-inspect
```

**Configuration (vite.config.ts):**
```typescript
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ],
});
```

#### React Performance Tools

| Tool | Purpose | Use Case |
|------|---------|----------|
| **React DevTools Profiler** | Component render profiling | Identify slow renders |
| **why-did-you-render** | Detect unnecessary re-renders | Optimization debugging |
| **react-window** | Virtualized lists | Large diagram lists |

#### Network Performance Tools

| Tool | Purpose | Use Case |
|------|---------|----------|
| **vite-plugin-compression** | Gzip/brotli compression | Reduce transfer size |
| **vite-plugin-pwa** | Service worker caching | Offline performance |

### 3.2 Recommended Testing Stack

| Category | Tool | Version | Purpose |
|----------|------|---------|---------|
| **Core** | lighthouse | 11.7.1 | Performance audits |
| **CI** | @lhci/cli | 0.13.0 | Automated testing |
| **Bundle analysis** | rollup-plugin-visualizer | latest | Bundle inspection |
| **CI/CD** | GitHub Actions | - | Automation platform |

### 3.3 Alternative Tools Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Lighthouse | WebPageTest | More detailed, but requires external service |
| @lhci/cli | Custom scripts | More control, but more maintenance |
| rollup-plugin-visualizer | webpack-bundle-analyzer | Better for Webpack, less optimized for Vite |

## 4. Implementation Considerations

### 4.1 Lighthouse Testing Strategy

#### Phase 1: Baseline Establishment (Week 1)

**Goal:** Establish performance baseline before optimizations

**Steps:**
1. Install Lighthouse CLI locally
2. Create performance testing script
3. Test on 4 critical scenarios:
   - Cold load (empty cache)
   - Warm load (primed cache)
   - Diagram creation flow
   - Diagram type switching
4. Document baseline metrics
5. Create historical baseline

**Script template (scripts/benchmark.ts):**
```typescript
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import { writeFileSync } from 'fs';

const SCENARIOS = [
  { url: 'http://localhost:5173', name: 'cold-load' },
  { url: 'http://localhost:5173?diagram=new', name: 'new-diagram' },
  { url: 'http://localhost:5173?type=sequence', name: 'sequence-diagram' },
];

async function runBenchmark() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu'],
  });

  const results = [];
  for (const scenario of SCENARIOS) {
    const result = await lighthouse(scenario.url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance'],
    });
    results.push({
      scenario: scenario.name,
      score: result.lhr.categories.performance.score * 100,
      metrics: {
        fcp: result.lhr.audits['first-contentful-paint'].numericValue,
        lcp: result.lhr.audits['largest-contentful-paint'].numericValue,
        tbt: result.lhr.audits['total-blocking-time'].numericValue,
        cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
      },
    });
  }

  await chrome.kill();
  writeFileSync('./lighthouse-baseline.json', JSON.stringify(results, null, 2));
  return results;
}

runBenchmark();
```

#### Phase 2: CI Integration (Week 2)

**Goal:** Automated performance regression detection

**GitHub Actions workflow (.github/workflows/lighthouse.yml):**
```yaml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run preview &
      - run: npx lhci autorun --collect.url=http://localhost:4173
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

#### Phase 3: Budget Assertions (Week 3)

**Goal:** Enforce performance budgets

**Configuration (.lighthouserc.json):**
```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        "categories:accessibility": ["warn", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.8 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 300 }],
        "resource-summary-total": ["error", { "maxNumericValue": 3000000 }]
      }
    }
  }
}
```

### 4.2 Performance Optimization Opportunities

#### 4.2.1 Bundle Size Reduction

**Current Issues:**
- 1.4MB render.js (likely all Mermaid modules)
- 1MB index.js (React + app code)
- No code splitting for diagram types

**Optimization Strategies:**

1. **Lazy Load Mermaid Diagram Types**
   ```typescript
   // Instead of importing all diagram types upfront
   // Use dynamic imports for specific diagram types

   const renderDiagram = async (type: string, code: string) => {
     const { default: mermaid } = await import('mermaid');
     await mermaid.init();
     // ... render logic
   };
   ```

2. **Code Split by Route/Feature**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'mermaid-core': ['mermaid'],
             'editor': ['@codemirror/view', '@codemirror/state'],
             'vendor': ['react', 'react-dom'],
           }
         }
       }
     }
   });
   ```

3. **Remove Unused Mermaid Diagram Types**
   - Only load diagram types user actually needs
   - Implement dynamic loading based on diagram type

4. **Tree Shaking**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks(id) {
             if (id.includes('node_modules')) {
               return 'vendor';
             }
           }
         }
       }
     }
   });
   ```

#### 4.2.2 Render Performance Optimization

**React-Specific Optimizations:**

1. **Memoize Expensive Components**
   ```typescript
   import { memo, useMemo, useCallback } from 'react';

   const PreviewPanel = memo(({ diagram, theme }) => {
     const renderedDiagram = useMemo(() => {
       return renderMermaid(diagram, theme);
     }, [diagram, theme]);

     return <div>{renderedDiagram}</div>;
   });
   ```

2. **Virtualization for Large Lists**
   ```typescript
   import { FixedSizeList } from 'react-window';

   const DiagramList = ({ diagrams }) => (
     <FixedSizeList
       height={600}
       itemCount={diagrams.length}
       itemSize={50}
     >
       {({ index, style }) => (
         <div style={style}>{diagrams[index].name}</div>
       )}
     </FixedSizeList>
   );
   ```

3. **Debounce Expensive Operations**
   ```typescript
   import { useDebouncedCallback } from 'use-debounce';

   const debouncedRender = useDebouncedCallback(
     (code) => renderDiagram(code),
     300
   );
   ```

4. **CodeMirror Optimization**
   ```typescript
   // Optimize CodeMirror extensions
   const extensions = useMemo(() => [
     javascript(),
     keymap.of(defaultKeymap),
     autocompletion(),
   ], []);
   ```

#### 4.2.3 Loading Performance Optimization

1. **Compression**
   ```typescript
   // vite.config.ts
   import viteCompression from 'vite-plugin-compression';

   export default defineConfig({
     plugins: [
       viteCompression({
         algorithm: 'gzip',
         ext: '.gz',
       }),
       viteCompression({
         algorithm: 'brotliCompress',
         ext: '.br',
       }),
     ],
   });
   ```

2. **Preload Critical Resources**
   ```html
   <!-- index.html -->
   <link rel="modulepreload" href="/assets/index-xyz.js">
   <link rel="modulepreload" href="/assets/vendor-abc.js">
   ```

3. **Service Worker Caching**
   ```typescript
   // vite-plugin-pwa
   import { VitePWA } from 'vite-plugin-pwa';

   export default defineConfig({
     plugins: [
       VitePWA({
         registerType: 'autoUpdate',
         workbox: {
           runtimeCaching: [
             {
               urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
               handler: 'CacheFirst',
               options: {
                 cacheName: 'google-fonts-cache',
               },
             },
           ],
         },
       }),
     ],
   });
   ```

### 4.3 Testing Infrastructure

#### 4.3.1 Performance Testing Script

**Create: scripts/performance-test.ts**
```typescript
#!/usr/bin/env node

import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestScenario {
  name: string;
  url: string;
  description: string;
}

const SCENARIOS: TestScenario[] = [
  {
    name: 'cold-load',
    url: 'http://localhost:5173',
    description: 'Initial page load with empty cache'
  },
  {
    name: 'warm-load',
    url: 'http://localhost:5173',
    description: 'Page load with primed cache'
  },
  {
    name: 'new-diagram',
    url: 'http://localhost:5173?action=new',
    description: 'Creating a new diagram'
  },
  {
    name: 'flowchart',
    url: 'http://localhost:5173?type=flowchart',
    description: 'Loading flowchart diagram type'
  },
];

interface BenchmarkResult {
  scenario: string;
  description: string;
  score: number;
  metrics: {
    fcp: number;
    lcp: number;
    tbt: number;
    cls: number;
    si: number;
  };
  timestamp: string;
}

async function runLighthouse(url: string, port: number) {
  const result = await lighthouse(url, {
    port,
    output: 'json',
    onlyCategories: ['performance'],
  });

  const lhr = result.lhr;
  return {
    score: lhr.categories.performance.score * 100,
    metrics: {
      fcp: lhr.audits['first-contentful-paint'].numericValue,
      lcp: lhr.audits['largest-contentful-paint'].numericValue,
      tbt: lhr.audits['total-blocking-time'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
      si: lhr.audits['speed-index'].numericValue,
    },
  };
}

async function runBenchmark(scenarios: TestScenario[]): Promise<BenchmarkResult[]> {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  });

  const results: BenchmarkResult[] = [];

  for (const scenario of scenarios) {
    console.log(`Testing: ${scenario.name} (${scenario.description})`);
    const lhr = await runLighthouse(scenario.url, chrome.port);

    results.push({
      scenario: scenario.name,
      description: scenario.description,
      ...lhr,
      timestamp: new Date().toISOString(),
    });

    console.log(`  Score: ${lhr.score}`);
    console.log(`  FCP: ${lhr.metrics.fcp}ms`);
    console.log(`  LCP: ${lhr.metrics.lcp}ms`);
  }

  await chrome.kill();
  return results;
}

// Create reports directory
const reportsDir = join(process.cwd(), 'lighthouse-reports');
mkdirSync(reportsDir, { recursive: true });

// Run benchmark
runBenchmark(SCENARIOS)
  .then(results => {
    const reportPath = join(reportsDir, `benchmark-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);
  })
  .catch(console.error);
```

#### 4.3.2 NPM Scripts

**Add to package.json:**
```json
{
  "scripts": {
    "lighthouse": "node scripts/performance-test.ts",
    "lighthouse:ci": "lhci autorun --collect.url=http://localhost:5173",
    "build:analyze": "vite build && npx rollup-plugin-visualizer",
    "preview:build": "vite preview --port 4173"
  }
}
```

### 4.4 Performance Targets

#### Baseline Targets (Before Optimization)

| Metric | Target | Current (Estimated) |
|--------|--------|---------------------|
| **Performance Score** | > 80 | TBD (needs measurement) |
| **First Contentful Paint** | < 1.8s | TBD |
| **Largest Contentful Paint** | < 2.5s | TBD |
| **Time to Interactive** | < 3.8s | TBD |
| **Total Blocking Time** | < 200ms | TBD |
| **Cumulative Layout Shift** | < 0.1 | TBD |
| **Bundle Size (gzipped)** | < 1MB | 1.4MB + 1MB = 2.4MB |

#### Optimization Targets (After Refactoring)

| Metric | Target | Expected Improvement |
|--------|--------|---------------------|
| **Performance Score** | > 90 | +10 points |
| **Bundle Size (gzipped)** | < 500KB | -75% |
| **First Contentful Paint** | < 1.0s | -44% |
| **Largest Contentful Paint** | < 1.5s | -40% |
| **Time to Interactive** | < 2.0s | -47% |

## 5. Risks & Unknowns

### 5.1 Known Risks

#### Risk 1: Mermaid.js Bundle Size
**Impact:** HIGH
**Probability:** CERTAIN

**Issue:** Mermaid.js is a large library (1.4MB render bundle) that includes all diagram types by default.

**Mitigation:**
- Implement dynamic imports for diagram types
- Load only required diagram types
- Consider alternative: mermaid-esm for tree-shaking
- Explore bundle splitting by diagram type

**Unknown:**
- Whether dynamic loading will break Mermaid's internal state
- Performance impact of lazy loading diagram types
- Compatibility with current theme system

#### Risk 2: React 19 Performance
**Impact:** MEDIUM
**Probability:** POSSIBLE

**Issue:** React 19 is new (version 19.2.4), performance characteristics less documented than React 18.

**Mitigation:**
- Use React DevTools Profiler extensively
- Monitor for React 19-specific performance issues
- Test concurrent features carefully

**Unknown:**
- React 19 performance best practices
- Interaction with Vite's HMR
- Compiler optimizations compatibility

#### Risk 3: CodeMirror 6 Performance
**Impact:** MEDIUM
**Probability:** POSSIBLE

**Issue:** CodeMirror 6 can be slow with large documents and many extensions.

**Mitigation:**
- Profile CodeMirror initialization
- Optimize extension loading
- Consider lazy loading for less-used extensions

**Unknown:**
- Current CodeMirror configuration performance
- Extension bundle sizes
- Impact on TTI

#### Risk 4: IndexedDB Performance
**Impact:** LOW
**Probability:** UNLIKELY

**Issue:** IndexedDB operations can be slow with large datasets.

**Mitigation:**
- Implement proper indexing
- Use transactions efficiently
- Cache frequently accessed data

**Unknown:**
- Current IndexedDB usage patterns
- Database size
- Query performance

### 5.2 Unknowns Requiring Investigation

#### 1. Actual Performance Baseline
**Question:** What are the current Lighthouse scores for MermaidStudio?

**Investigation needed:**
- Run Lighthouse on all 4 critical scenarios
- Measure bundle sizes more precisely
- Profile React render times
- Identify specific bottlenecks

**Why unknown:** No performance testing has been done yet

#### 2. Mermaid Tree-Shaking Feasibility
**Question:** Can we tree-shake unused Mermaid diagram types?

**Investigation needed:**
- Test Mermaid ESM exports
- Verify diagram type isolation
- Test dynamic loading
- Measure bundle size reduction

**Why unknown:** Mermaid's bundle structure not fully understood

#### 3. Code Splitting Strategy Effectiveness
**Question:** What's the optimal code splitting strategy for MermaidStudio?

**Investigation needed:**
- Test route-based splitting
- Test feature-based splitting
- Test manual chunk configuration
- Measure impact on load times

**Why unknown:** No current code splitting implemented

#### 4. Render Performance Bottlenecks
**Question:** What causes the 1.4MB render.js bundle?

**Investigation needed:**
- Analyze render.js bundle composition
- Identify specific dependencies
- Determine if React or Mermaid-related
- Find optimization opportunities

**Why unknown:** Bundle analysis not performed

#### 5. CI/CD Infrastructure
**Question:** What CI/CD platform is being used?

**Investigation needed:**
- Check for GitHub Actions
- Check for other CI systems
- Determine Lighthouse CI compatibility
- Plan automation strategy

**Why unknown:** Repository structure doesn't show CI config

### 5.3 Implementation Risks

#### Risk 5: Performance Regression During Optimization
**Impact:** HIGH
**Probability:** POSSIBLE

**Issue:** Optimization attempts may inadvertently degrade performance.

**Mitigation:**
- Establish baseline before any changes
- Use Lighthouse CI for regression detection
- Test each optimization independently
- Measure before/after for each change

#### Risk 6: Breaking Changes During Refactoring
**Impact:** HIGH
**Probability:** POSSIBLE

**Issue:** Code splitting and lazy loading may break existing functionality.

**Mitigation:**
- Comprehensive E2E test coverage (Playwright exists)
- Incremental refactoring
- Test each change thoroughly
- Maintain feature parity

#### Risk 7: Theme System Compatibility
**Impact:** MEDIUM
**Probability:** POSSIBLE

**Issue:** Current theme system may not work with lazy-loaded diagram types.

**Mitigation:**
- Test theme application with lazy loading
- Ensure theme initialization happens before render
- May need theme preloading strategy

### 5.4 Open Questions

1. **Lighthouse Integration**
   - What CI/CD platform will be used?
   - Should we use Lighthouse CI or manual CLI?
   - How often should performance tests run?
   - What performance targets are acceptable?

2. **Mermaid Optimization**
   - Can Mermaid be tree-shaken by diagram type?
   - Will dynamic loading break theme system?
   - What's the performance impact of lazy loading?
   - Are there smaller Mermaid alternatives?

3. **React Performance**
   - Are there unnecessary re-renders?
   - Is memoization used appropriately?
   - Can components be split more granularly?
   - What's the impact of React 19 features?

4. **Build Optimization**
   - Is Vite optimally configured?
   - Can build time be improved?
   - Are there unused dependencies?
   - Can compression be improved?

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tools | ✓ | v24.0.0+ | — |
| npm | Package management | ✓ | v10.0.0+ | — |
| Vite | Build system | ✓ | v8.0.2 | — |
| Lighthouse CLI | Performance testing | ✗ | — | Install via npm |
| @lhci/cli | CI integration | ✗ | — | Use manual CLI |
| Chrome/Chromium | Lighthouse runtime | ? | — | System default |
| GitHub Actions | CI/CD (optional) | ? | — | Local testing only |

**Missing dependencies with no fallback:**
- None blocking (can install Lighthouse locally)

**Missing dependencies with fallback:**
- Lighthouse CLI: Can install via npm (not blocking)
- @lhci/cli: Can use manual Lighthouse CLI instead (not blocking)
- Chrome/Chromium: Lighthouse will download Chromium automatically (not blocking)
- GitHub Actions: Can run tests locally instead (not blocking)

**Installation commands:**
```bash
# Install Lighthouse CLI for local testing
npm install -D lighthouse

# Install Lighthouse CI for CI/CD (optional)
npm install -D @lhci/cli

# Install bundle analyzer
npm install -D rollup-plugin-visualizer

# Install compression plugin
npm install -D vite-plugin-compression
```

## Sources

### Primary (HIGH confidence)
- [Lighthouse Official Documentation](https://developer.chrome.com/docs/lighthouse) - Lighthouse metrics and usage
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci) - CI integration patterns
- [Vite Build Optimization](https://vitejs.dev/guide/build.html) - Official Vite optimization docs
- [Vite Plugin Ecosystem](https://vitejs.dev/plugins/) - Official plugin list

### Secondary (MEDIUM confidence)
- [Core Web Vitals](https://web.dev/vitals/) - Performance metric definitions
- [Web.dev Performance Guides](https://web.dev/fast/) - Performance optimization techniques
- [React Performance Optimization](https://react.dev/learn/render-and-commit) - React rendering patterns
- [CodeMirror 6 Documentation](https://codemirror.net/docs/) - CodeMirror optimization

### Tertiary (LOW confidence)
- Package documentation from npm registry
- Community best practices (require verification)
- Stack Overflow discussions (require official source verification)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation available for all tools
- Architecture: MEDIUM - Some unknowns about Mermaid internals and React 19
- Pitfalls: MEDIUM - General performance risks identified, specific ones need verification
- Implementation: HIGH - Clear path forward with Lighthouse integration

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (30 days - performance tools are stable, but web platform evolves)

**Next steps for planning:**
1. Create PLAN-01: Lighthouse CLI integration and baseline establishment
2. Create PLAN-02: Bundle analysis and optimization strategy
3. Create PLAN-03: Code splitting implementation
4. Create PLAN-04: React render optimization
5. Create PLAN-05: CI/CD integration and performance regression detection
