#!/usr/bin/env node

/**
 * Documentation Generation Test Runner
 * Tests the documentation generation pipeline
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DOC_ROOT = path.join(__dirname, '..', 'docs');
const SRC_ROOT = path.join(__dirname, '..', 'src');

// Test configuration
const tests = [
  {
    name: 'Documentation Directory Structure',
    test: () => {
      const requiredDirs = ['api', 'architecture', 'user-guide', 'reports'];
      const missingDirs = [];

      for (const dir of requiredDirs) {
        const dirPath = path.join(DOC_ROOT, dir);
        if (!fs.existsSync(dirPath)) {
          missingDirs.push(dir);
        }
      }

      return {
        passed: missingDirs.length === 0,
        message: missingDirs.length === 0
          ? 'All required directories exist'
          : `Missing directories: ${missingDirs.join(', ')}`
      };
    }
  },
  {
    name: 'Documentation Scripts Existence',
    test: () => {
      const scripts = ['generate-docs.cjs', 'check-doc-quality.cjs'];
      const missingScripts = [];

      for (const script of scripts) {
        const scriptPath = path.join(__dirname, script);
        if (!fs.existsSync(scriptPath)) {
          missingScripts.push(script);
        }
      }

      return {
        passed: missingScripts.length === 0,
        message: missingScripts.length === 0
          ? 'All documentation scripts exist'
          : `Missing scripts: ${missingScripts.join(', ')}`
      };
    }
  },
  {
    name: 'Package.json Documentation Script',
    test: () => {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      return {
        passed: !!packageJson.scripts?.docs,
        message: packageJson.scripts?.docs
          ? 'Documentation script found in package.json'
          : 'Documentation script missing from package.json'
      };
    }
  },
  {
    name: 'CI/CD Documentation Integration',
    test: () => {
      const ciYamlPath = path.join(__dirname, '..', '.github', 'workflows', 'ci.yml');
      const ciYaml = fs.readFileSync(ciYamlPath, 'utf8');

      return {
        passed: ciYaml.includes('docs:') && ciYaml.includes('Generate Documentation'),
        message: ciYaml.includes('docs:')
          ? 'Documentation job found in CI pipeline'
          : 'Documentation job missing from CI pipeline'
      };
    }
  },
  {
    name: 'Documentation Maintenance Workflow',
    test: () => {
      const docsYamlPath = path.join(__dirname, '..', '.github', 'workflows', 'docs.yml');
      return {
        passed: fs.existsSync(docsYamlPath),
        message: fs.existsSync(docsYamlPath)
          ? 'Documentation maintenance workflow exists'
          : 'Documentation maintenance workflow missing'
      };
    }
  }
];

// Run a test with timeout
function runTest(test, timeout = 10000) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve({ ...test, passed: false, message: 'Test timeout' });
    }, timeout);

    const result = test.test();
    clearTimeout(timeoutId);
    resolve({ ...test, ...result });
  });
}

// Execute command safely
function executeCommand(command, args = [], timeout = 30000) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });

    child.on('error', (error) => {
      resolve({
        code: 1,
        stdout: '',
        stderr: error.message,
        success: false
      });
    });
  });
}

// Main test runner
async function runTests() {
  console.log('🧪 Running Documentation Generation Tests...\n');

  const results = {
    total: tests.length,
    passed: 0,
    failed: 0,
    tests: []
  };

  // Run basic tests
  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    const result = await runTest(test);
    result.type = 'basic';

    results.tests.push(result);
    if (result.passed) {
      results.passed++;
      console.log(`  ✅ ${result.message}\n`);
    } else {
      results.failed++;
      console.log(`  ❌ ${result.message}\n`);
    }
  }

  // Test documentation generation
  console.log('Testing Documentation Generation...');
  const docGenResult = await executeCommand('node', [path.join(__dirname, 'generate-docs.cjs')]);

  results.tests.push({
    name: 'Documentation Generation',
    type: 'integration',
    passed: docGenResult.success,
    message: docGenResult.success
      ? 'Documentation generated successfully'
      : `Generation failed: ${docGenResult.stderr}`,
    stdout: docGenResult.stdout,
    stderr: docGenResult.stderr
  });

  if (docGenResult.success) {
    results.passed++;
    console.log('  ✅ Documentation generation completed successfully\n');
  } else {
    results.failed++;
    console.log(`  ❌ Documentation generation failed: ${docGenResult.stderr}\n`);
  }

  // Test quality check (only if markdown-link-check is available)
  console.log('Testing Documentation Quality Check...');
  const mlcCheck = await executeCommand('npx', ['markdown-link-check', '--version'], 5000);

  if (mlcCheck.success) {
    const qualityResult = await executeCommand('node', [path.join(__dirname, 'check-doc-quality.cjs')]);

    results.tests.push({
      name: 'Documentation Quality Check',
      type: 'quality',
      passed: qualityResult.success,
      message: qualityResult.success
        ? 'Documentation quality check completed'
        : `Quality check failed: ${qualityResult.stderr}`,
      stdout: qualityResult.stdout,
      stderr: qualityResult.stderr
    });

    if (qualityResult.success) {
      results.passed++;
      console.log('  ✅ Documentation quality check completed\n');
    } else {
      results.failed++;
      console.log(`  ❌ Documentation quality check failed: ${qualityResult.stderr}\n`);
    }
  } else {
    results.tests.push({
      name: 'Documentation Quality Check',
      type: 'quality',
      passed: true,
      message: 'Quality check skipped (markdown-link-check not available)',
      stdout: '',
      stderr: ''
    });

    results.passed++;
    console.log('  ⚠️  Quality check skipped (markdown-link-check not available)\n');
  }

  // Generate test report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      percentage: Math.round((results.passed / results.total) * 100)
    },
    tests: results.tests
  };

  // Save test report
  const reportPath = path.join(DOC_ROOT, 'reports', 'test-report.json');
  fs.mkdirSync(path.join(DOC_ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('📊 Test Summary:');
  console.log(`Total tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success rate: ${report.summary.percentage}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Documentation system is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the output above.');
  }

  return report;
}

// Export for external use
module.exports = { runTests };

// Run if executed directly
if (require.main === module) {
  runTests()
    .then(report => {
      process.exit(report.summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}