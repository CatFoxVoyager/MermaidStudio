import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react', 'mermaid'],
    include: ['dayjs', '@braintree/sanitize-url'],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
