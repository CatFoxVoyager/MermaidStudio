import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

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
    exclude: ['lucide-react'],
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
            // React core
            if (id.includes('/react/') || id.includes('/react-dom/')) {
              return 'react-vendor';
            }
            // Mermaid - split into core, layout and parser
            if (id.includes('mermaid')) {
              if (id.includes('@mermaid-js/layout-elk')) return 'mermaid-elk';
              if (id.includes('@mermaid-js/parser')) return 'mermaid-parser';
              return 'mermaid-core';
            }
            // CodeMirror - separate core and features
            if (id.includes('@codemirror/') || id.includes('codemirror') || id.includes('@lezer/')) {
              if (id.includes('language') || id.includes('autocomplete') || id.includes('commands') || id.includes('search')) {
                return 'codemirror-features';
              }
              return 'codemirror-core';
            }
            // Other major libraries
            if (id.includes('lucide-react')) return 'lucide';
            if (id.includes('i18next')) return 'i18n';
            if (id.includes('dompurify')) return 'dompurify';
            if (id.includes('d3-') || id.includes('dagre')) return 'chart-libs';
            if (id.includes('langium') || id.includes('chevrotain')) return 'parsing-libs';
            
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 2500,
  },
});
