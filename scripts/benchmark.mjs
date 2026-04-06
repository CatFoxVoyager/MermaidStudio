#!/usr/bin/env node

/**
 * Lighthouse Benchmark Script
 *
 * This script builds the app, starts a preview server, runs Lighthouse audits,
 * and generates performance reports.
 *
 * Usage: node scripts/benchmark.mjs
 */

import { execFileSync } from 'child_process';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

let previewProcess = null;
let chrome = null;

/**
 * Cleanup function to kill background processes
 */
async function cleanup() {
  console.log(`\n${colors.yellow}Cleaning up...${colors.reset}`);

  if (previewProcess) {
    previewProcess.kill('SIGTERM');
    previewProcess = null;
  }

  if (chrome) {
    await chrome.kill();
    chrome = null;
  }
}

/**
 * Format a metric value with appropriate units
 */
function formatMetric(value, unit) {
  if (unit === 'ms') {
    return `${value.toFixed(0)} ms`;
  } else if (unit === 'score') {
    return `${Math.round(value * 100)}`;
  } else {
    return `${value}`;
  }
}

/**
 * Print results table to console
 */
function printResults(results) {
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║         Lighthouse Performance Benchmark Results       ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╠════════════════════════════════════════════════════════╣${colors.reset}`);

  const score = Math.round(results.score * 100);
  const scoreColor = score >= 90 ? colors.green : score >= 50 ? colors.yellow : colors.red;

  console.log(`${colors.bright}${colors.cyan}║  Performance Score: ${scoreColor}${score}${colors.reset} ${colors.cyan}                          ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╠════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  Metrics:                                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                                                        ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  FCP  (First Contentful Paint):    ${colors.green}${formatMetric(results.metrics.fcp, 'ms').padStart(12)}${colors.reset} ${colors.cyan}  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  LCP  (Largest Contentful Paint):  ${colors.green}${formatMetric(results.metrics.lcp, 'ms').padStart(12)}${colors.reset} ${colors.cyan}  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  TBT  (Total Blocking Time):      ${colors.yellow}${formatMetric(results.metrics.tbt, 'ms').padStart(12)}${colors.reset} ${colors.cyan}  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  CLS  (Cumulative Layout Shift):  ${colors.green}${formatMetric(results.metrics.cls, 'score').padStart(12)}${colors.reset} ${colors.cyan}  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  SI   (Speed Index):               ${colors.green}${formatMetric(results.metrics.si, 'ms').padStart(12)}${colors.reset} ${colors.cyan}  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╠════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  Timestamp: ${results.timestamp}                ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);
}

/**
 * Main benchmark execution
 */
async function runBenchmark() {
  try {
    console.log(`${colors.bright}${colors.cyan}Starting Lighthouse Benchmark...${colors.reset}\n`);

    // Step 1: Build the app
    console.log(`${colors.bright}Step 1: Building application...${colors.reset}`);
    execFileSync('npm', ['run', 'build'], { cwd: rootDir, stdio: 'inherit' });
    console.log(`${colors.green}✓ Build complete${colors.reset}\n`);

    // Step 2: Start preview server
    console.log(`${colors.bright}Step 2: Starting preview server on port 4173...${colors.reset}`);
    previewProcess = spawn('npm', ['run', 'preview', '--', '--port', '4173'], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log(`${colors.green}✓ Preview server started${colors.reset}\n`);

    // Step 3: Launch Chrome
    console.log(`${colors.bright}Step 3: Launching Chrome...${colors.reset}`);
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
      logLevel: 'error',
    });
    console.log(`${colors.green}✓ Chrome launched on port ${chrome.port}${colors.reset}\n`);

    // Step 4: Run Lighthouse
    console.log(`${colors.bright}Step 4: Running Lighthouse audit...${colors.reset}`);
    const runnerResult = await lighthouse('http://localhost:4173', {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance'],
      logLevel: 'error',
    });

    const lhr = runnerResult.lhr;
    console.log(`${colors.green}✓ Lighthouse audit complete${colors.reset}\n`);

    // Step 5: Extract metrics
    const score = lhr.categories.performance.score;
    const metrics = {
      fcp: lhr.audits['first-contentful-paint'].numericValue,
      lcp: lhr.audits['largest-contentful-paint'].numericValue,
      tbt: lhr.audits['total-blocking-time'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
      si: lhr.audits['speed-index'].numericValue,
    };

    const results = {
      timestamp: new Date().toISOString(),
      scenario: 'initial-load',
      score,
      metrics,
    };

    // Step 6: Ensure reports directory exists
    const reportsDir = join(rootDir, 'lighthouse-reports');
    mkdirSync(reportsDir, { recursive: true });

    // Step 7: Write JSON report
    const timestamp = Date.now();
    const jsonPath = join(reportsDir, `baseline-${timestamp}.json`);
    writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`${colors.green}✓ JSON report written to: ${jsonPath}${colors.reset}`);

    // Step 8: Write HTML report
    const htmlReport = runnerResult.report;
    const htmlPath = join(reportsDir, `baseline-${timestamp}.html`);
    writeFileSync(htmlPath, htmlReport);
    console.log(`${colors.green}✓ HTML report written to: ${htmlPath}${colors.reset}\n`);

    // Step 9: Print results
    printResults(results);

    // Step 10: Check if score is acceptable
    if (score < 0.5) {
      console.error(`${colors.red}Performance score is below 50 (${Math.round(score * 100)}). This indicates serious performance issues.${colors.reset}`);
      process.exit(1);
    }

    console.log(`${colors.green}${colors.bright}Benchmark complete!${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}Error during benchmark:${colors.reset}`, error.message);

    if (error.message && error.message.includes('Chrome')) {
      console.error(`\n${colors.yellow}Chrome/Chromium not found. Please install Chrome or Chromium to run Lighthouse benchmarks.${colors.reset}`);
      console.error(`${colors.yellow}Download: https://www.google.com/chrome/${colors.reset}\n`);
    }

    throw error;
  } finally {
    await cleanup();
  }
}

// Run the benchmark
runBenchmark().catch((error) => {
  console.error(`${colors.red}Benchmark failed:${colors.reset}`, error);
  process.exit(1);
});
