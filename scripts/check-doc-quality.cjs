#!/usr/bin/env node

/**
 * Documentation Quality Checker
 * Validates documentation quality, links, and freshness
 */

const fs = require('fs');
const path = require('path');
const { execFileNoThrow } = require('./execFileUtils.cjs');

// Helper to check if markdown-link-check is available
async function checkMarkdownLinkCheckAvailable() {
  try {
    const result = await execFileNoThrow('npx', ['markdown-link-check', '--version'], { timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

const DOC_ROOT = path.join(__dirname, '..', 'docs');
const SRC_ROOT = path.join(__dirname, '..', 'src');

// Helper functions
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.warn(`Warning: Could not read ${filePath}: ${err.message}`);
    return '';
  }
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// Check broken links in markdown files
async function checkLinks() {
  console.log('🔍 Checking for broken links...');

  const markdownFiles = fs.readdirSync(DOC_ROOT, { recursive: true })
    .filter(file => file.endsWith('.md'));

  const results = {
    totalFiles: markdownFiles.length,
    filesWithBrokenLinks: 0,
    brokenLinks: []
  };

  const hasMlc = await checkMarkdownLinkCheckAvailable();

  if (!hasMlc) {
    console.log('⚠️  markdown-link-check not found, skipping link validation');
    return results;
  }

  for (const file of markdownFiles) {
    const filePath = path.join(DOC_ROOT, file);
    const relativePath = path.relative(DOC_ROOT, filePath);

    // Check links using markdown-link-check if available
    const result = await execFileNoThrow('npx', ['markdown-link-check', filePath, '--quiet'], {
      timeout: 30000
    });

    if (result.status !== 0) {
      results.filesWithBrokenLinks++;
      results.brokenLinks.push({
        file: relativePath,
        error: result.stderr || 'Unknown error'
      });
    }
  }

  return results;
}

// Check documentation coverage
function checkDocumentationCoverage() {
  console.log('📊 Checking documentation coverage...');

  const results = {
    totalFiles: 0,
    documentedFiles: 0,
    coveragePercentage: 0,
    undocumentedFiles: []
  };

  // Find all TypeScript files
  const tsFiles = [];
  const extensions = ['.ts', '.tsx'];

  function findTsFiles(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      if (file.isDirectory()) {
        findTsFiles(path.join(dir, file.name));
      } else if (extensions.includes(path.extname(file.name))) {
        tsFiles.push(path.join(dir, file.name));
      }
    }
  }

  findTsFiles(SRC_ROOT);
  results.totalFiles = tsFiles.length;

  // Check for documentation
  tsFiles.forEach(file => {
    const content = readFile(file);
    const relativePath = path.relative(SRC_ROOT, file);

    // Look for JSDoc comments (///)
    if (content.includes('///') || content.includes('/**')) {
      results.documentedFiles++;
    } else {
      results.undocumentedFiles.push(relativePath);
    }
  });

  results.coveragePercentage = results.totalFiles > 0
    ? Math.round((results.documentedFiles / results.totalFiles) * 100)
    : 100;

  return results;
}

// Check for outdated documentation
function checkOutdatedDocs() {
  console.log('📅 Checking documentation freshness...');

  const results = {
    needsUpdates: false,
    outdatedFiles: [],
    lastUpdates: {}
  };

  const markdownFiles = fs.readdirSync(DOC_ROOT, { recursive: true })
    .filter(file => file.endsWith('.md'));

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  markdownFiles.forEach(file => {
    const filePath = path.join(DOC_ROOT, file);
    const stats = fs.statSync(filePath);

    if (stats.mtime.getTime() < thirtyDaysAgo) {
      results.needsUpdates = true;
      results.outdatedFiles.push({
        file: path.relative(DOC_ROOT, filePath),
        daysOutdated: Math.floor((thirtyDaysAgo - stats.mtime.getTime()) / (24 * 60 * 60 * 1000))
      });
    }

    // Extract last update date from content
    const content = readFile(filePath);
    const dateMatch = content.match(/Last updated: (\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      results.lastUpdates[file] = dateMatch[1];
    }
  });

  return results;
}

// Generate quality report
async function generateQualityReport() {
  console.log('📈 Generating documentation quality report...');

  const reportPath = path.join(DOC_ROOT, 'reports', 'quality-report.md');
  const linkResults = await checkLinks();
  const coverageResults = checkDocumentationCoverage();
  const freshnessResults = checkOutdatedDocs();

  // Ensure reports directory exists
  const reportsDir = path.join(DOC_ROOT, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let content = `# Documentation Quality Report\n\n`;
  content += `Generated: ${new Date().toISOString().split('T')[0]}\n\n`;

  // Link Validation
  content += `## Link Validation\n\n`;
  content += `- Total markdown files: ${linkResults.totalFiles}\n`;
  content += `- Files with broken links: ${linkResults.filesWithBrokenLinks}\n`;
  content += `- Link health: ${Math.round((1 - linkResults.filesWithBrokenLinks / linkResults.totalFiles) * 100)}%\n\n`;

  if (linkResults.brokenLinks.length > 0) {
    content += `### Files with Issues:\n\n`;
    linkResults.brokenLinks.forEach(issue => {
      content += `- ${issue.file}: ${issue.error}\n`;
    });
    content += '\n';
  }

  // Coverage Analysis
  content += `## Documentation Coverage\n\n`;
  content += `- Total TypeScript files: ${coverageResults.totalFiles}\n`;
  content += `- Documented files: ${coverageResults.documentedFiles}\n`;
  content += `- Coverage: ${coverageResults.coveragePercentage}%\n\n`;

  if (coverageResults.undocumentedFiles.length > 0) {
    content += `### Undocumented Files:\n\n`;
    coverageResults.undocumentedFiles.slice(0, 20).forEach(file => {
      content += `- ${file}\n`;
    });
    if (coverageResults.undocumentedFiles.length > 20) {
      content += `\n... and ${coverageResults.undocumentedFiles.length - 20} more\n`;
    }
    content += '\n';
  }

  // Freshness Check
  content += `## Freshness Check\n\n`;
  content += `Documentation is ${freshnessResults.needsUpdates ? 'stale' : 'up to date'}\n\n`;

  if (freshnessResults.needsUpdates) {
    content += `### Outdated Files:\n\n`;
    freshnessResults.outdatedFiles.forEach(file => {
      content += `- ${file.file}: ${file.daysOutdated} days old\n`;
    });
    content += '\n';
  }

  // Recommendations
  content += `## Recommendations\n\n`;

  if (linkResults.filesWithBrokenLinks > 0) {
    content += `- 🔗 Fix broken links in ${linkResults.filesWithBrokenLinks} files\n`;
  }

  if (coverageResults.coveragePercentage < 80) {
    content += `- 📚 Improve documentation coverage (currently ${coverageResults.coveragePercentage}%)\n`;
  }

  if (freshnessResults.needsUpdates) {
    content += `- 📅 Update outdated documentation\n`;
  }

  content += `\n*Generated by Documentation Quality Checker*\n`;

  writeFile(reportPath, content);
  console.log(`✅ Quality report generated: ${reportPath}`);

  return {
    links: linkResults,
    coverage: coverageResults,
    freshness: freshnessResults,
    reportPath
  };
}

// Export functions for external use
module.exports = {
  checkLinks,
  checkDocumentationCoverage,
  checkOutdatedDocs,
  generateQualityReport
};

// Run if executed directly
if (require.main === module) {
  (async () => {
    try {
      const report = await generateQualityReport();

      console.log('\n📊 Summary:');
      console.log(`- Link health: ${Math.round((1 - report.links.filesWithBrokenLinks / report.links.totalFiles) * 100)}%`);
      console.log(`- Documentation coverage: ${report.coverage.coveragePercentage}%`);
      console.log(`- Documentation status: ${report.freshness.needsUpdates ? 'Needs updates' : 'Up to date'}`);

      process.exit(report.links.filesWithBrokenLinks > 0 || report.coverage.coveragePercentage < 80 ? 1 : 0);
    } catch (error) {
      console.error('❌ Error generating quality report:', error);
      process.exit(1);
    }
  })();
}