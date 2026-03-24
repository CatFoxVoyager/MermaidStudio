#!/usr/bin/env node

/**
 * Documentation Generator Script
 * Generates comprehensive documentation from the codebase
 */

const fs = require('fs');
const path = require('path');

const DOC_ROOT = path.join(__dirname, '..', 'docs');
const SRC_ROOT = path.join(__dirname, '..', 'src');

// Ensure docs directory exists
if (!fs.existsSync(DOC_ROOT)) {
  fs.mkdirSync(DOC_ROOT, { recursive: true });
}

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

function extractJSDoc(content) {
  const jsdocRegex = /\/\*\*\s*\n([\s\S]*?)\s*\*\//g;
  const matches = [];
  let match;

  while ((match = jsdocRegex.exec(content)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

function extractFunctionInfo(content) {
  const functionRegex = /export(?: async)? function (\w+)\s*\([^)]*\)\s*(?::\s*([^{\s]+))?\s*{[^}]*}/g;
  const functions = [];
  let match;

  while ((match = functionRegex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      returnType: match[2] || 'void'
    });
  }

  return functions;
}

// Generate API documentation
function generateAPIDocs() {
  console.log('📚 Generating API Documentation...');

  const apiDocsPath = path.join(DOC_ROOT, 'api', 'README.md');
  let content = `# API Documentation\n\n`;
  content += `This document provides a comprehensive overview of the MermaidStudio API and internal interfaces.\n\n`;

  // Extract hooks
  const hooksDir = path.join(SRC_ROOT, 'hooks');
  if (fs.existsSync(hooksDir)) {
    content += `## Custom Hooks\n\n`;

    const hookFiles = fs.readdirSync(hooksDir)
      .filter(file => file.endsWith('.ts'))
      .map(file => path.join(hooksDir, file));

    hookFiles.forEach(file => {
      const fileName = path.basename(file, '.ts');
      const fileContent = readFile(file);

      content += `### use${fileName.charAt(0).toUpperCase() + fileName.slice(1)}\n\n`;

      const jsdocMatches = extractJSDoc(fileContent);
      if (jsdocMatches.length > 0) {
        jsdocMatches[0].split('\n').forEach(line => {
          if (line.trim().startsWith('@')) {
            content += `${line.replace(/^@[a-zA-Z]+/, '**$&**')}\n`;
          } else if (line.trim()) {
            content += `${line.trim()}\n`;
          }
        });
      }

      const functions = extractFunctionInfo(fileContent);
      if (functions.length > 0) {
        content += `\n**Functions:**\n`;
        functions.forEach(func => {
          content += `- ${func.name}(): ${func.returnType}\n`;
        });
      }

      content += '\n---\n\n';
    });
  }

  // Extract services
  const servicesDir = path.join(SRC_ROOT, 'services');
  if (fs.existsSync(servicesDir)) {
    content += `## Services\n\n`;

    const serviceDirs = fs.readdirSync(servicesDir);

    serviceDirs.forEach(dir => {
      const servicePath = path.join(servicesDir, dir);
      if (fs.statSync(servicePath).isDirectory()) {
        const files = fs.readdirSync(servicePath)
          .filter(file => file.endsWith('.ts'));

        content += `### ${dir.charAt(0).toUpperCase() + dir.slice(1)} Service\n\n`;

        files.forEach(file => {
          const fileContent = readFile(path.join(servicePath, file));
          const fileName = path.basename(file, '.ts');

          content += `#### ${fileName}\n\n`;
          const jsdocMatches = extractJSDoc(fileContent);
          if (jsdocMatches.length > 0) {
            jsdocMatches[0].split('\n').forEach(line => {
              if (line.trim().startsWith('@')) {
                content += `${line.replace(/^@[a-zA-Z]+/, '**$&**')}\n`;
              } else if (line.trim()) {
                content += `${line.trim()}\n`;
              }
            });
          }
          content += '\n';
        });
      }
    });
  }

  // Extract types
  const typesDir = path.join(SRC_ROOT, 'types');
  if (fs.existsSync(typesDir)) {
    content += `## Type Definitions\n\n`;

    const typeFiles = fs.readdirSync(typesDir)
      .filter(file => file.endsWith('.ts'));

    typeFiles.forEach(file => {
      const fileContent = readFile(path.join(typesDir, file));
      const fileName = path.basename(file, '.ts');

      content += `### ${fileName}\n\n`;
      const typeExports = fileContent.match(/export (type|interface|class) \w+/g) || [];
      typeExports.forEach(typeExport => {
        content += `- ${typeExport}\n`;
      });
      content += '\n';
    });
  }

  // Update last modified date
  const today = new Date().toISOString().split('T')[0];
  content += `*Last updated: ${today}*\n`;

  writeFile(apiDocsPath, content);
  console.log(`✅ API documentation generated: ${apiDocsPath}`);
}

// Generate architecture documentation
function generateArchitectureDocs() {
  console.log('🏗️  Generating Architecture Documentation...');

  const archDocsPath = path.join(DOC_ROOT, 'architecture', 'README.md');
  let content = `# Architecture Documentation\n\n`;
  content += `This document describes the system architecture, components, and design patterns used in MermaidStudio.\n\n`;

  // Component overview
  content += `## Component Overview\n\n`;
  const componentsDir = path.join(SRC_ROOT, 'components');
  if (fs.existsSync(componentsDir)) {
    const components = fs.readdirSync(componentsDir);
    content += `The application is built with the following main components:\n\n`;

    components.forEach(dir => {
      const componentPath = path.join(componentsDir, dir);
      if (fs.statSync(componentPath).isDirectory()) {
        const indexFile = path.join(componentPath, 'index.tsx');
        if (fs.existsSync(indexFile)) {
          const fileContent = readFile(indexFile);
          const componentMatch = fileContent.match(/export function (\w+)\s*\(/);
          if (componentMatch) {
            content += `- **${componentMatch[1]}**: ${dir.charAt(0).toUpperCase() + dir.slice(1)} components\n`;
          }
        }
      }
    });
  }

  // State management
  content += `\n## State Management\n\n`;
  content += `The application uses React hooks for state management:\n\n`;
  content += `- **useTheme**: Manages dark/light theme\n`;
  content += `- **useTabs**: Handles multi-tab diagram editing\n`;
  content += `- **useToast**: Manages toast notifications\n`;
  content += `- **useKeyboardShortcuts**: Handles keyboard shortcuts\n`;

  // Data flow
  content += `\n## Data Flow\n\n`;
  content += `1. User actions trigger state updates via hooks\n`;
  content += `2. State changes propagate to child components\n`;
  content += `3. Components re-render with updated data\n`;
  content += `4. Diagram rendering is updated via Mermaid integration\n`;

  // Storage architecture
  content += `\n## Storage Architecture\n\n`;
  content += `The application uses localStorage for persistence:\n\n`;
  content += `### Storage Structure\n`;
  content += `\`\`\`typescript\n`;
  content += `interface StorageData {\n`;
  content += `  diagrams: Diagram[];\n`;
  content += `  settings: Settings;\n`;
  content += `  versionHistory: VersionHistory;\n`;
  content += `}\n`;
  content += `\`\`\`\n\n`;

  // Security considerations
  content += `## Security Considerations\n\n`;
  content += `All diagram content is sanitized before rendering using DOMPurify to prevent XSS attacks.\n\n`;
  content += `### Security Features\n`;
  content += `- **Input Validation**: All diagram syntax is validated\n`;
  content += `- **Output Sanitization**: SVG output is sanitized\n`;
  content += `- **API Key Storage**: API keys are stored in localStorage (user-controlled)\n`;
  content += `- **CSP Headers**: Content Security Policy for production\n`;

  // Update last modified date
  const today = new Date().toISOString().split('T')[0];
  content += `*Last updated: ${today}*\n`;

  writeFile(archDocsPath, content);
  console.log(`✅ Architecture documentation generated: ${archDocsPath}`);
}

// Generate contribution guidelines
function generateContributingDocs() {
  console.log('🤝 Generating Contribution Guidelines...');

  const contributingPath = path.join(DOC_ROOT, 'CONTRIBUTING.md');
  let content = `# Contributing to MermaidStudio\n\n`;
  content += `Thank you for your interest in contributing to MermaidStudio! This document provides guidelines for contributing to the project.\n\n`;

  // Getting started
  content += `## Getting Started\n\n`;
  content += `1. Fork the repository\n`;
  content += `2. Clone your fork: \`git clone https://github.com/your-username/mermaid-studio.git\`\n`;
  content += `3. Install dependencies: \`npm install\`\n`;
  content += `4. Create a new branch: \`git checkout -b feature/amazing-feature\`\n`;
  content += `5. Make your changes\n`;
  content += `6. Run tests: \`npm test\`\n`;
  content += `7. Run linting: \`npm run lint\`\n`;
  content += `8. Commit your changes: \`git commit -m 'feat: add amazing feature'\`\n`;
  content += `9. Push to your fork: \`git push origin feature/amazing-feature\`\n`;
  content += `10. Create a pull request\n\n`;

  // Code style
  content += `## Code Style\n\n`;
  content += `We follow strict code style guidelines:\n\n`;
  content += `### TypeScript\n`;
  content += `- Use strict TypeScript configuration\n`;
  content += `- Define types for all function parameters\n`;
  content += `- Enable noImplicitAny and strictNullChecks\n\n`;
  content += `### React\n`;
  content += `- Use functional components with hooks\n`;
  content += `- Prefer useCallback for functions passed to props\n`;
  content += `- Use useMemo for expensive calculations\n\n`;
  content += `### CSS\n`;
  content += `- Use Tailwind CSS classes only\n`;
  content += `- No CSS modules or styled-components\n`;
  content += `- Mobile-first responsive design\n\n`;

  // Testing
  content += `## Testing\n\n`;
  content += `We use Vitest for testing:\n\n`;
  content += `### Running Tests\n`;
  content += `\`\`\`bash\n`;
  content += `# Run all tests\n`;
  content += `npm test\n`;
  content += `\n`;
  content += `# Run tests with coverage\n`;
  content += `npm run test:coverage\n`;
  content += `\`\`\`\n\n`;
  content += `### Writing Tests\n`;
  content += `- Write unit tests for all components\n`;
  content += `- Test all error scenarios\n`;
  content += `- Use Jest mocks for external dependencies\n\n`;

  // Git workflow
  content += `## Git Workflow\n\n`;
  content += `### Branch Naming\n`;
  content += `- Features: \`feature/description\`\n`;
  content += `- Bug fixes: \`fix/description\`\n`;
  content += `- Documentation: \`docs/description\`\n`;
  content += `- Tests: \`test/description\`\n\n`;
  content += `### Commit Messages\n`;
  content += `Use conventional commits:\n\n`;
  content += `\`\`\`text\n`;
  content += `<type>[optional scope]: <description>\n`;
  content += `\n`;
  content += `[body]\n`;
  content += `[footer]\n`;
  content += `\`\`\`\n\n`;
  content += `Types:\n`;
  content += `- \`feat\`: New feature\n`;
  content += `- \`fix\`: Bug fix\n`;
  content += `- \`docs\`: Documentation changes\n`;
  content += `- \`style\`: Code style changes\n`;
  content += `- \`refactor\`: Code refactoring\n`;
  content += `- \`test\`: Test changes\n`;
  content += `- \`chore\`: Build process or tooling changes\n\n`;

  // Pull request process
  content += `## Pull Request Process\n\n`;
  content += `1. Ensure your code passes all tests\n`;
  content += `2. Update documentation if needed\n`;
  content += `3. Add test cases for new features\n`;
  content += `4. Create a pull request with a clear title\n`;
  content += `5. Fill out the pull request template\n`;
  content += `6. Wait for review\n`;
  content += `7. Address feedback\n`;
  content += `8. Get approval and merge\n\n`;

  // Reporting bugs
  content += `## Reporting Bugs\n\n`;
  content += `When reporting bugs, please include:\n\n`;
  content += `- Steps to reproduce\n`;
  content += `- Expected behavior\n`;
  content += `- Actual behavior\n`;
  content += `- Browser version\n`;
  content += `- Screenshots if helpful\n\n`;

  // Update last modified date
  const today = new Date().toISOString().split('T')[0];
  content += `*Last updated: ${today}*\n`;

  writeFile(contributingPath, content);
  console.log(`✅ Contributing guidelines generated: ${contributingPath}`);
}

// Main function
function main() {
  console.log('🚀 Starting documentation generation...\n');

  try {
    // Generate all documentation
    generateAPIDocs();
    generateArchitectureDocs();
    generateContributingDocs();

    console.log('\n✅ Documentation generation completed successfully!');
    console.log('\n📚 Generated files:');
    console.log('- docs/api/README.md');
    console.log('- docs/architecture/README.md');
    console.log('- docs/CONTRIBUTING.md');

    // Update main docs README
    updateDocsIndex();

  } catch (error) {
    console.error('❌ Error generating documentation:', error);
    process.exit(1);
  }
}

// Update documentation index
function updateDocsIndex() {
  const indexPath = path.join(DOC_ROOT, 'README.md');
  let content = `# MermaidStudio Documentation\n\n`;
  content += `Welcome to the MermaidStudio documentation!\n\n`;
  content += `## Documentation Structure\n\n`;
  content += `### For Users\n`;
  content += `- [User Guide](user-guide/README.md) - Complete user documentation\n`;
  content += `- [Quick Start](user-guide/quick-start.md) - Get started in minutes\n`;
  content += `- [Tutorials](user-guide/tutorials.md) - Step-by-step tutorials\n\n`;
  content += `### For Developers\n`;
  content += `- [Developer Guide](developer-guide/README.md) - Setup and development\n`;
  content += `- [Architecture](architecture/README.md) - System architecture\n`;
  content += `- [API Documentation](api/README.md) - Internal API reference\n\n`;
  content += `### For Contributors\n`;
  content += `- [Contributing](CONTRIBUTING.md) - How to contribute\n\n`;
  content += `## Quick Links\n\n`;
  content += `- [Live Demo](https://app.mermaidstudio.com)\n`;
  content += `- [GitHub Repository](https://github.com/your-username/mermaid-studio)\n`;
  content += `- [Issues](https://github.com/your-username/mermaid-studio/issues)\n\n`;

  const today = new Date().toISOString().split('T')[0];
  content += `*Last updated: ${today}*\n`;

  writeFile(indexPath, content);
  console.log(`✅ Documentation index updated: ${indexPath}`);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  generateAPIDocs,
  generateArchitectureDocs,
  generateContributingDocs,
  updateDocsIndex
};