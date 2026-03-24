const fs = require('fs');
const path = require('path');

/**
 * Execute a command synchronously safely
 */
function execSyncSafe(command, options = {}) {
  try {
    return require('child_process').execSync(command, {
      ...options,
      stdio: 'pipe',
      shell: false,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 30000 // 30s timeout
    });
  } catch (error) {
    if (error.signal === 'SIGTERM' || error.signal === 'SIGKILL') {
      console.error(`Command timed out: ${command}`);
      throw error;
    }
    console.error(`Command failed: ${command}`);
    console.error(`Error: ${error.message}`);
    return null;
  }
}

/**
 * Generate a comprehensive E2E test report
 */
function generateE2EReport() {
  const reportDir = path.join(process.cwd(), 'test-results');
  const reportFile = path.join(reportDir, 'e2e-report.json');
  const htmlReportFile = path.join(reportDir, 'e2e-report.html');

  // Create report directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Get test results from Playwright
  console.log('Running Playwright tests...');
  try {
    // Run Playwright test to get JSON results
    const result = execSyncSafe('npx playwright test --reporter=list');
    if (result) {
      console.log('Tests completed successfully');
    }
  } catch (error) {
    console.log('Tests completed with failures');
  }

  // Generate JSON report
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0
    },
    duration: 0,
    browserResults: {},
    failures: []
  };

  // Read playwright reports
  const playwrightReportDir = path.join(reportDir, 'playwright-report');
  if (fs.existsSync(playwrightReportDir)) {
    const files = fs.readdirSync(playwrightReportDir);
    const testFiles = files.filter(f => f.endsWith('.json'));

    testFiles.forEach(file => {
      const filePath = path.join(playwrightReportDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (data.results) {
        data.results.forEach(result => {
          report.summary.total++;
          if (result.status === 'passed') {
            report.summary.passed++;
          } else if (result.status === 'failed') {
            report.summary.failed++;
            report.failures.push({
              title: result.title,
              error: result.error?.message || 'Unknown error',
              duration: result.duration,
              retry: result.retry,
              browser: result.browserName
            });
          } else if (result.status === 'skipped') {
            report.summary.skipped++;
          }
          if (result.retry) {
            report.summary.flaky++;
          }
          report.duration += result.duration || 0;
        });
      }
    });
  }

  // Generate HTML report
  const passRate = report.summary.total > 0 ?
    Math.round((report.summary.passed / report.summary.total) * 100) : 0;

  const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mermaid Studio E2E Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 30px;
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
        }
        .card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
        }
        .card .number {
            font-size: 32px;
            font-weight: bold;
        }
        .card.passed .number { color: #28a745; }
        .card.failed .number { color: #dc3545; }
        .card.skipped .number { color: #ffc107; }
        .card.total .number { color: #007bff; }
        .card.duration .number { color: #6c757d; }
        .card.rate .number { color: #17a2b8; }

        .failures {
            margin-top: 30px;
        }
        .failure {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .failure h4 {
            margin: 0 0 10px 0;
            color: #c53030;
        }
        .failure pre {
            background: #f7fafc;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 14px;
            margin: 0;
        }
        .browser-info {
            display: inline-block;
            background: #e9ecef;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-top: 5px;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            margin-top: 10px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: ${passRate > 80 ? '#28a745' : passRate > 60 ? '#ffc107' : '#dc3545'};
            transition: width 0.3s ease;
        }
        .no-failures {
            text-align: center;
            padding: 40px;
            background: #d4edda;
            border-radius: 6px;
            color: #155724;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Mermaid Studio E2E Test Report</h1>

        <div class="summary">
            <div class="card total">
                <h3>Total Tests</h3>
                <div class="number">${report.summary.total}</div>
            </div>
            <div class="card passed">
                <h3>Passed</h3>
                <div class="number">${report.summary.passed}</div>
            </div>
            <div class="card failed">
                <h3>Failed</h3>
                <div class="number">${report.summary.failed}</div>
            </div>
            <div class="card skipped">
                <h3>Skipped</h3>
                <div class="number">${report.summary.skipped}</div>
            </div>
            <div class="card duration">
                <h3>Duration</h3>
                <div class="number">${(report.duration / 1000).toFixed(1)}s</div>
            </div>
            <div class="card rate">
                <h3>Pass Rate</h3>
                <div class="number">${passRate}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${passRate}%"></div>
                </div>
            </div>
        </div>

        ${report.failures.length > 0 ? `
        <div class="failures">
            <h2>Test Failures (${report.failures.length})</h2>
            ${report.failures.map(failure => `
                <div class="failure">
                    <h4>${failure.title}</h4>
                    <pre>${failure.error}</pre>
                    <div class="browser-info">Browser: ${failure.browser}</div>
                    ${failure.retry ? '<div class="browser-info">Retry: Yes</div>' : ''}
                    <div class="browser-info">Duration: ${(failure.duration / 1000).toFixed(1)}s</div>
                </div>
            `).join('')}
        </div>
        ` : `
        <div class="no-failures">
            <h2>🎉 All tests passed!</h2>
            <p>No failures detected in the E2E test suite.</p>
        </div>
        `}

        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
            Report generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;

  // Write reports
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  fs.writeFileSync(htmlReportFile, htmlReport);

  console.log(`\n✅ E2E Test Report generated:`);
  console.log(`   JSON:  ${reportFile}`);
  console.log(`   HTML:  ${htmlReportFile}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total: ${report.summary.total}`);
  console.log(`   Passed: ${report.summary.passed}`);
  console.log(`   Failed: ${report.summary.failed}`);
  console.log(`   Skipped: ${report.summary.skipped}`);
  console.log(`   Pass Rate: ${passRate}%`);
  console.log(`   Duration: ${(report.duration / 1000).toFixed(1)}s`);
}

if (require.main === module) {
  generateE2EReport();
}

module.exports = { generateE2EReport };