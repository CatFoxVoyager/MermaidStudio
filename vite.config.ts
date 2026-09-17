import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import fs from 'fs';

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
        // Rolldown's advancedChunks replaces manualChunks (the two cannot
        // coexist — declaring advancedChunks makes Rolldown ignore
        // manualChunks entirely). Manual chunks were migrated rule-for-rule
        // as ordered groups: with equal priority the earlier group wins,
        // matching the old first-match-wins cascade.
        advancedChunks: {
          groups: [
            {
              // Vite's \0-prefixed runtime helpers (dynamic-import preload
              // helper, modulepreload polyfill, browser-external stub).
              // manualChunks cannot capture them — its return value is
              // ignored for virtual modules — and Rolldown otherwise parks
              // the shared preload helper inside ai-webgpu, making the ~2 MB
              // web-llm chunk a static dependency of the entry chunk.
              name: 'vite-helpers',
              test: (id: string) =>
                id.includes('vite/preload-helper') ||
                id.includes('vite/modulepreload-polyfill') ||
                id === '__vite-browser-external',
            },
            {
              // AI - Transformers.js and ONNX
              name: 'ai-transformers',
              test: (id: string) =>
                id.includes('node_modules') &&
                (id.includes('@huggingface/transformers') || id.includes('onnxruntime-web')),
            },
            {
              // AI - web-llm (LAZY: only reached through the dynamic import
              // in WebGPUMLCProvider)
              name: 'ai-webgpu',
              test: (id: string) => id.includes('node_modules') && id.includes('@mlc-ai/web-llm'),
            },
            // React core
            {
              name: 'react-vendor',
              test: (id: string) =>
                id.includes('node_modules') && (id.includes('/react/') || id.includes('/react-dom/')),
            },
            // Mermaid parser chunk
            {
              name: 'mermaid-parser',
              test: (id: string) => id.includes('node_modules') && id.includes('@mermaid-js/parser'),
            },
            // Mermaid core. Deliberately NOT matching mermaid's internal ELK
            // async chunk (dist/chunks/*/elk-*.mjs) nor elkjs: they must fall
            // through to automatic chunking so mermaid's own dynamic-import
            // boundary (lazy elk-*.js chunks) survives.
            {
              name: 'mermaid-core',
              test: (id: string) =>
                id.includes('node_modules') &&
                id.includes('mermaid') &&
                !/mermaid[/\\]dist[/\\]chunks[/\\].*elk-.+\.mjs(\?|$)/.test(id) &&
                !id.includes('elkjs'),
            },
            // CodeMirror - features first, then core
            {
              name: 'codemirror-features',
              test: (id: string) =>
                id.includes('node_modules') &&
                (id.includes('@codemirror/') || id.includes('codemirror') || id.includes('@lezer/')) &&
                (id.includes('language') ||
                  id.includes('autocomplete') ||
                  id.includes('commands') ||
                  id.includes('search')),
            },
            {
              name: 'codemirror-core',
              test: (id: string) =>
                id.includes('node_modules') &&
                (id.includes('@codemirror/') || id.includes('codemirror') || id.includes('@lezer/')),
            },
            // Other major libraries
            { name: 'lucide', test: (id: string) => id.includes('node_modules') && id.includes('lucide-react') },
            { name: 'i18n', test: (id: string) => id.includes('node_modules') && id.includes('i18next') },
            { name: 'dompurify', test: (id: string) => id.includes('node_modules') && id.includes('dompurify') },
            {
              name: 'chart-libs',
              test: (id: string) => id.includes('node_modules') && (id.includes('d3-') || id.includes('dagre')),
            },
            {
              name: 'parsing-libs',
              test: (id: string) => id.includes('node_modules') && (id.includes('langium') || id.includes('chevrotain')),
            },
            // vendor catch-all. Deliberately NOT capturing elkjs (nor
            // mermaid's elk-*.mjs above): under manualChunks these returned
            // undefined to stay out of every manual chunk, and letting the
            // catch-all swallow elkjs would inline ~1.6 MB of ELK into this
            // eager chunk (caught by scripts/check-elk-chunk.mjs).
            {
              name: 'vendor',
              test: (id: string) =>
                id.includes('node_modules') && !id.includes('elkjs') && !/elk-.+\.mjs(\?|$)/.test(id),
            },
          ],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    sourcemap: false,
    reportCompressedSize: true,
    // 7000: the only chunks over the default 2500 kB limit are ai-webgpu (~6 MB,
    // LAZY — dynamic-imported by WebGPUMLCProvider, not in the initial bundle)
    // and mermaid-core (~2.9 MB v11 baseline, Mermaid core — its bundled ELK
    // loads separately via mermaid's own lazy elk-* chunk). Neither is a real
    // initial-load problem, so raise the limit instead of over-splitting.
    chunkSizeWarningLimit: 7000,
  },
});
