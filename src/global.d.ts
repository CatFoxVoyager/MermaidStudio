// Global type declarations for browser APIs
// These extend existing DOM types with additional properties needed by the application

declare global {
  interface NodeJS {
    process?: {
      env?: {
        NODE_ENV?: string;
      };
    };
  }
}

export {};
