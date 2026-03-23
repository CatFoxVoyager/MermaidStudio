// src/types/storage.ts
// Data persistence types extracted from types/index.ts

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface Diagram {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagramVersion {
  id: string;
  diagram_id: string;
  content: string;
  label: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Tab {
  id: string;
  diagram_id: string;
  title: string;
  content: string;
  saved_content: string;
  is_dirty: boolean;
}
