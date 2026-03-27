// src/types/ui.ts
// UI component types extracted from types/index.ts

export interface AppSettings {
  theme: 'dark' | 'light';
  language: 'en' | 'fr';
  ai_api_key?: string;
  ai_provider: import('./ai').AIProvider;
  ai_base_url: string;
  ai_model: string;
  /** ID of the last opened diagram to restore on page reload */
  lastOpenDiagramId?: string;
  /** Internal encrypted storage key - not exposed to consumers */
  _encryptedKey?: string;
  /** Auto-save interval in ms; null = off */
  autoSaveIntervalMs?: number | null;
}

export interface UserTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  complexity: 'simple' | 'moderate' | 'advanced';
  content: string;
  type: import('./mermaid').DiagramType;
  created_at: string;
}

export interface BackupData {
  version: number;
  exported_at: string;
  folders: import('./storage').Folder[];
  diagrams: import('./storage').Diagram[];
  versions: import('./storage').DiagramVersion[];
  tags: import('./storage').Tag[];
  diagramTags: { diagram_id: string; tag_id: string }[];
  userTemplates: UserTemplate[];
  settings?: AppSettings; // Optional for backward compatibility
}
