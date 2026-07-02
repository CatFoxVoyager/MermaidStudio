import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import fs from 'fs';

const emptyModule = 'data:text/javascript,export default {}';

// Single source of truth for the app version. Read from package.json and
// injected both as a JS compile-time constant (__APP_VERSION__) and into
// index.html via the %APP_VERSION% placeholder so the version never has to be
// hardcoded in more than one place.
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const APP_VERSION: string = pkg.version;

const appVersionHtmlPlugin = {
  name: 'app-version-html',
  transformIndexHtml(html: string) {
    return html.replaceAll('%APP_VERSION%', APP_VERSION);
  },
};

const ignoreModulesPlugin = {
  name: 'ignore-modules',
  setup(build: any) {
    ['ws', 'perf_hooks'].forEach((mod) => {
      build.onResolve({ filter: new RegExp(`^${mod}$`) }, () => ({
        path: mod,
        namespace: 'ignore',
      }));
      build.onLoad({ filter: /.*/, namespace: 'ignore' }, () => ({
        contents: 'export default {}',
        loader: 'js',
      }));
    });
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    appVersionHtmlPlugin,
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
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  optimizeDeps: {
    rolldownOptions: {
      plugins: [ignoreModulesPlugin],
    },
    exclude: ['lucide-react', '@huggingface/transformers'],
    include: ['@mlc-ai/web-llm'],

  },
  server: {
    host: true,
    port: 5173,
    https: fs.existsSync('.cert/cert.pem') ? {
      key: fs.readFileSync('.cert/key.pem'),
      cert: fs.readFileSync('.cert/cert.pem'),
    } : undefined,
    strictPort: false,
    fs: {
      allow: ['..', 'D:/code/web-llm'],
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    // Enable better minification (use default for compatibility)
    target: 'esnext',
    // Improve chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // AI - Transformers.js and ONNX
            if (id.includes('@huggingface/transformers') || id.includes('onnxruntime-web')) {
              return 'ai-transformers';
            }
            if (id.includes('@mlc-ai/web-llm')) {
              return 'ai-webgpu';
            }
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
            if (
              id.includes('@codemirror/') ||
              id.includes('codemirror') ||
              id.includes('@lezer/')
            ) {
              if (
                id.includes('language') ||
                id.includes('autocomplete') ||
                id.includes('commands') ||
                id.includes('search')
              ) {
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
