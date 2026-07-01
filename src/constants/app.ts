// Single source of truth for the app version. The value is injected at build
// time by Vite (`define` in vite.config.ts), read from package.json, so the
// version only ever needs to be bumped in package.json.
export const APP_VERSION: string = __APP_VERSION__;
