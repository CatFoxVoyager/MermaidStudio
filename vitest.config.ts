import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({ jsxImportSource: 'react' }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'docker', '.*/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'docker/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/types/',
        '**/*.d.ts',
        'tests/setup.ts',
        'src/main.tsx',
        'src/vite-env.d.ts'
      ],
      thresholds: {
        // Global thresholds reflect codebase composition:
        // - Refactored hooks/services/utils: 75-100% coverage
        // - Legacy UI components (PreviewPanel, ColorPicker): 30-55%
        // - Large Mermaid utilities (codeUtils, autocomplete): 15-60%
        // Raising global thresholds requires ~150+ tests on legacy components
        // for diminishing returns.
        lines: 65,
        functions: 64,
        branches: 59,
        statements: 62
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
