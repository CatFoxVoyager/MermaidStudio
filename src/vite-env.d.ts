/// <reference types="vite/client" />

// Injected by Vite `define` from package.json (see vite.config.ts).
declare const __APP_VERSION__: string;

// 36-01 (GA4-01): the measurement id env contract — absent until USR-01 sets
// it in Vercel (the loader's missing-env branch is the designed no-op).
interface ImportMetaEnv {
  readonly VITE_GA4_MEASUREMENT_ID?: string;
}
