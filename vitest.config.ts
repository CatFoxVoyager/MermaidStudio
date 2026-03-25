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
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
