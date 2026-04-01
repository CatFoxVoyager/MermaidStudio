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
    include: ['dayjs', '@braintree/sanitize-url', 'langium'],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    // Enable better minification (use default for compatibility)
    target: 'esnext',
    // Improve chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core - stable, cacheable
            if (id.includes('/react/') || id.includes('/react-dom/')) {
              return 'react-vendor';
            }
            // CodeMirror editor - lazy load this since it's only needed in editor
            if (id.includes('@codemirror/') || id.includes('codemirror') || id.includes('@lezer/')) {
              return 'codemirror-vendor';
            }
            // Mermaid - split by diagram type for better lazy loading
            if (id.includes('mermaid') && !id.includes('mermaid-studio')) {
              if (id.includes('@mermaid-js/layout-elk')) {
                return 'mermaid-elk';
              }
              return 'mermaid-core';
            }
            // Lucide icons - could be tree-shaken better
            if (id.includes('lucide-react')) {
              return 'lucide';
            }
            // i18n - translations can be code-split by language
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n';
            }
            // DOMPurify - security library
            if (id.includes('dompurify') || id.includes('isomorphic-dompurify')) {
              return 'dompurify';
            }
            // D3 and dagre - heavy chart libraries
            if (id.includes('d3-') || id.includes('dagre') || id.includes('roughjs')) {
              return 'chart-libs';
            }
            // Other vendor
            return 'vendor';
          }
        },
        // Ensure consistent chunk hashing for long-term caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Improve source map generation for production
    sourcemap: false,
    // Report compressed sizes for accurate production metrics
    reportCompressedSize: true,
    // Chunk size warning threshold (increase for heavy libraries)
    chunkSizeWarningLimit: 1000,
  },
});
