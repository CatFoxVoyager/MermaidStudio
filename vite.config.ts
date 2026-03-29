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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core - stable, cacheable
            if (id.includes('/react/') || id.includes('/react-dom/')) {
              return 'react-vendor';
            }
            // CodeMirror editor - large but stable
            if (id.includes('@codemirror/') || id.includes('codemirror') || id.includes('@lezer/')) {
              return 'codemirror-vendor';
            }
            // Mermaid is already auto-split by diagram type by Vite's default chunking.
            // Keep the mermaid core + elk layout in its own chunk.
            if (id.includes('mermaid') && !id.includes('mermaid-studio')) {
              // Let Vite's default chunking handle mermaid - it already splits diagram types
              return undefined;
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'lucide';
            }
            // i18n
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n';
            }
            // Other vendor
            return 'vendor';
          }
        },
      },
    },
  },
});
