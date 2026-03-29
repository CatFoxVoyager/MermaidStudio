import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
