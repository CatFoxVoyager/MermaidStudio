/**
 * IndexedDB-based storage for MermaidStudio
 * Replaces localStorage with much higher capacity and better persistence
 *
 * Automatically migrates data from localStorage on first load
 */

import type { Diagram, DiagramVersion, Folder, Tag, AppSettings, UserTemplate, BackupData } from '@/types';
import { encrypt, decrypt } from '@/utils/encryption';
import { generateSecureId } from '@/utils/crypto';

const DB_NAME = 'MermaidStudio';
const DB_VERSION = 1;
const STORE_DATA = 'data';
const LOCAL_KEY = 'mermaid_studio_v1';

interface DBData {
  folders: Folder[];
  diagrams: Diagram[];
  versions: DiagramVersion[];
  tags: Tag[];
  diagramTags: { diagram_id: string; tag_id: string }[];
  settings: AppSettings;
  userTemplates: UserTemplate[];
}

let dbCache: IDBDatabase | null = null;
let dataCache: DBData | null = null;

/**
 * Open or create the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  if (dbCache) {return Promise.resolve(dbCache);}

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbCache = request.result;
      resolve(dbCache);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DATA)) {
        db.createObjectStore(STORE_DATA);
      }
    };
  });
}

/**
 * Get data from IndexedDB, migrating from localStorage if needed
 */
async function load(): Promise<DBData> {
  if (dataCache) {return dataCache;}

  try {
    const db = await openDB();
    const data = await new Promise<DBData | undefined>((resolve, reject) => {
      const transaction = db.transaction([STORE_DATA], 'readonly');
      const store = transaction.objectStore(STORE_DATA);
      const request = store.get('main');

      request.onsuccess = () => resolve(request.result as DBData | undefined);
      request.onerror = () => reject(request.error);
    });

    if (data) {
      dataCache = data;
      return data;
    }

    // Migrate from localStorage if IndexedDB is empty
    const migrated = await migrateFromLocalStorage();
    dataCache = migrated;
    await save(migrated);
    return migrated;

  } catch (error) {
    console.error('IndexedDB error, falling back to localStorage:', error);
    // Fallback to localStorage if IndexedDB fails
    const fallback = await getFromLocalStorageFallback();
    dataCache = fallback;
    return fallback;
  }
}

/**
 * Save data to IndexedDB
 */
async function save(data: DBData): Promise<void> {
  dataCache = data;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_DATA], 'readwrite');
      const store = transaction.objectStore(STORE_DATA);
      const request = store.put(data, 'main');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB save failed, saving to localStorage:', error);
    // Fallback to localStorage
    saveToLocalStorageFallback(data);
  }
}

/**
 * Migrate data from localStorage to IndexedDB
 */
async function migrateFromLocalStorage(): Promise<DBData> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DBData;
      // Apply migrations if needed
      if (parsed.userTemplates) {parsed.userTemplates = [];}
      if (parsed.settings.ai_provider) {parsed.settings.ai_provider = 'openai';}
      if (parsed.settings.ai_base_url) {parsed.settings.ai_base_url = 'https://api.openai.com';}
      if (parsed.settings.ai_model) {parsed.settings.ai_model = 'gpt-5.3-instant';}
      console.log('✅ Migrated data from localStorage to IndexedDB');
      return parsed;
    }
  } catch (error) {
    console.warn('[DB] Failed to migrate from localStorage:', error);
  }
  return createFreshData();
}

/**
 * Fallback: Get data from localStorage
 */
async function getFromLocalStorageFallback(): Promise<DBData> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DBData;
      // Apply migrations if needed (same as migrateFromLocalStorage)
      if (parsed.userTemplates) {parsed.userTemplates = [];}
      if (parsed.settings.ai_provider) {parsed.settings.ai_provider = 'openai';}
      if (parsed.settings.ai_base_url) {parsed.settings.ai_base_url = 'https://api.openai.com';}
      if (parsed.settings.ai_model) {parsed.settings.ai_model = 'gpt-5.3-instant';}
      return parsed;
    }
  } catch (error) {
    console.warn('[DB] Failed to read from localStorage fallback:', error);
  }
  return createFreshData();
}

/**
 * Fallback: Save data to localStorage
 */
function saveToLocalStorageFallback(data: DBData): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[DB] Failed to save to localStorage fallback:', error);
  }
}

/**
 * Create fresh default data
 */
function createFreshData(): DBData {
  return {
    folders: [],
    diagrams: [{
      id: generateSecureId(),
      title: 'Welcome Diagram',
      content: `flowchart TD
    A([Start]) --> B{Is it working?}
    B -->|Yes| C[🎉 Great!]
    B -->|No| D[Debug it]
    D --> B
    C --> E([End])`,
      folder_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    versions: [],
    tags: [
      { id: generateSecureId(), name: 'architecture', color: '#3b82f6' },
      { id: generateSecureId(), name: 'workflow', color: '#22c55e' },
      { id: generateSecureId(), name: 'draft', color: '#f59e0b' },
    ],
    diagramTags: [],
    settings: {
      theme: 'dark',
      language: 'en',
      ai_api_key: '',
      ai_provider: 'openai',
      ai_base_url: 'https://api.openai.com',
      ai_model: 'gpt-5.3-instant'
    },
    userTemplates: [],
  };
}

export function clearCache() {
  dataCache = null;
}

function uid() {
  return generateSecureId();
}

// ===== Folders =====
export async function getFolders(): Promise<Folder[]> {
  return (await load()).folders;
}

export async function createFolder(name: string, parent_id: string | null = null): Promise<Folder> {
  const data = await load();
  const f: Folder = { id: uid(), name, parent_id, created_at: new Date().toISOString() };
  data.folders.push(f);
  await save(data);
  return f;
}

export async function updateFolder(id: string, name: string): Promise<void> {
  const data = await load();
  const f = data.folders.find(f => f.id === id);
  if (f) { f.name = name; await save(data); }
}

export async function deleteFolder(id: string): Promise<void> {
  const data = await load();
  data.folders = data.folders.filter(f => f.id !== id && f.parent_id !== id);
  data.diagrams = data.diagrams.map(d => d.folder_id === id ? { ...d, folder_id: null } : d);
  await save(data);
}

// ===== Diagrams =====
export async function getDiagrams(): Promise<Diagram[]> {
  return (await load()).diagrams;
}

export async function getDiagram(id: string): Promise<Diagram | undefined> {
  return (await load()).diagrams.find(d => d.id === id);
}

export async function createDiagram(title: string, content = 'flowchart TD\n    A --> B', folder_id: string | null = null): Promise<Diagram> {
  const data = await load();
  const d: Diagram = { id: uid(), title, content, folder_id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  data.diagrams.push(d);
  await save(data);
  return d;
}

export async function updateDiagram(id: string, updates: Partial<Diagram>): Promise<void> {
  const data = await load();
  const d = data.diagrams.find(d => d.id === id);
  if (d) { Object.assign(d, updates, { updated_at: new Date().toISOString() }); await save(data); }
}

export async function deleteDiagram(id: string): Promise<void> {
  const data = await load();
  data.diagrams = data.diagrams.filter(d => d.id !== id);
  data.versions = data.versions.filter(v => v.diagram_id !== id);
  data.diagramTags = data.diagramTags.filter(dt => dt.diagram_id !== id);
  await save(data);
}

export async function deleteDiagrams(ids: string[]): Promise<void> {
  const data = await load();
  data.diagrams = data.diagrams.filter(d => !ids.includes(d.id));
  data.versions = data.versions.filter(v => !ids.includes(v.diagram_id));
  data.diagramTags = data.diagramTags.filter(dt => !ids.includes(dt.diagram_id));
  await save(data);
}

export async function moveDiagramsToFolder(diagramIds: string[], folderId: string | null): Promise<void> {
  const data = await load();

  diagramIds.forEach(id => {
    const diagram = data.diagrams.find(d => d.id === id);
    if (diagram) {
      diagram.folder_id = folderId;
      diagram.updated_at = new Date().toISOString();
    }
  });

  await save(data);
}

// ===== Versions =====
export async function getVersions(diagram_id: string): Promise<DiagramVersion[]> {
  const data = await load();
  return data.versions.filter(v => v.diagram_id === diagram_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function saveVersion(diagram_id: string, content: string, label = ''): Promise<DiagramVersion> {
  const data = await load();
  const v: DiagramVersion = { id: uid(), diagram_id, content, label, created_at: new Date().toISOString() };
  data.versions.push(v);
  const all = data.versions.filter(x => x.diagram_id === diagram_id);
  if (all.length > 50) {
    const oldest = all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    data.versions = data.versions.filter(x => x.id !== oldest.id);
  }
  await save(data);
  return v;
}

// ===== Tags =====
export async function getTags(): Promise<Tag[]> {
  return (await load()).tags;
}

export async function getDiagramTags(diagram_id: string): Promise<Tag[]> {
  const data = await load();
  const ids = data.diagramTags.filter(dt => dt.diagram_id === diagram_id).map(dt => dt.tag_id);
  return data.tags.filter(t => ids.includes(t.id));
}

export async function toggleDiagramTag(diagram_id: string, tag_id: string): Promise<void> {
  const data = await load();
  const idx = data.diagramTags.findIndex(dt => dt.diagram_id === diagram_id && dt.tag_id === tag_id);
  if (idx >= 0) {data.diagramTags.splice(idx, 1);}
  else {data.diagramTags.push({ diagram_id, tag_id });}
  await save(data);
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const data = await load();
  const t: Tag = { id: uid(), name, color };
  data.tags.push(t);
  await save(data);
  return t;
}

export async function deleteTag(id: string): Promise<void> {
  const data = await load();
  data.tags = data.tags.filter(t => t.id !== id);
  data.diagramTags = data.diagramTags.filter(dt => dt.tag_id !== id);
  await save(data);
}

export async function getDiagramsForTag(tag_id: string): Promise<string[]> {
  return (await load()).diagramTags.filter(dt => dt.tag_id === tag_id).map(dt => dt.diagram_id);
}

// ===== User Templates =====
export async function getUserTemplates(): Promise<UserTemplate[]> {
  return (await load()).userTemplates;
}

export async function saveUserTemplate(t: Omit<UserTemplate, 'id' | 'created_at'>): Promise<UserTemplate> {
  const data = await load();
  const ut: UserTemplate = { ...t, id: uid(), created_at: new Date().toISOString() };
  data.userTemplates.push(ut);
  await save(data);
  return ut;
}

export async function deleteUserTemplate(id: string): Promise<void> {
  const data = await load();
  data.userTemplates = data.userTemplates.filter(t => t.id !== id);
  await save(data);
}

// ===== Settings =====
export async function getSettings(): Promise<AppSettings> {
  const db = await load();
  const settings = { ...db.settings };

  // Migrate legacy plaintext API key if present
  if (settings.ai_api_key && !settings._encryptedKey) {
    const plaintextKey = settings.ai_api_key;
    const encryptedKey = await encrypt(plaintextKey);

    db.settings._encryptedKey = encryptedKey;
    delete db.settings.ai_api_key;

    settings._encryptedKey = encryptedKey;
    delete settings.ai_api_key;

    await save(db);
  }

  // Decrypt API key if encrypted version exists
  if (settings._encryptedKey) {
    settings.ai_api_key = await decrypt(settings._encryptedKey);
    delete settings._encryptedKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _encryptedKey, ...cleanSettings } = settings;
  return cleanSettings;
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  const db = await load();

  // Encrypt API key if provided
  if (updates.ai_api_key !== undefined) {
    db.settings._encryptedKey = await encrypt(updates.ai_api_key);
  }

  // Apply all updates EXCEPT ai_api_key (which should only be stored as _encryptedKey)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ai_api_key, ...safeUpdates } = updates;
  Object.assign(db.settings, safeUpdates);

  // Ensure ai_api_key is not stored in the database (only _encryptedKey)
  if ('ai_api_key' in db.settings) {
    delete db.settings.ai_api_key;
  }

  await save(db);
}

// ===== Backup / Import =====
export async function exportBackup(): Promise<BackupData> {
  const db = await load();
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    folders: db.folders,
    diagrams: db.diagrams,
    versions: db.versions,
    tags: db.tags,
    diagramTags: db.diagramTags,
    userTemplates: db.userTemplates,
    settings: db.settings, // Include settings (with encrypted API key)
  };
}

export async function importBackup(data: BackupData): Promise<{ diagrams: number; folders: number }> {
  const db = await load();
  const existingDiagramIds = new Set(db.diagrams.map(d => d.id));
  const existingFolderIds = new Set(db.folders.map(f => f.id));

  let dCount = 0;
  let fCount = 0;

  for (const f of data.folders) {
    if (!existingFolderIds.has(f.id)) {
      db.folders.push(f);
      existingFolderIds.add(f.id);
      fCount++;
    }
  }

  for (const d of data.diagrams) {
    if (!existingDiagramIds.has(d.id)) {
      db.diagrams.push(d);
      existingDiagramIds.add(d.id);
      dCount++;
    }
  }

  for (const v of data.versions) {
    if (!db.versions.some(x => x.id === v.id)) {
      db.versions.push(v);
    }
  }

  for (const t of data.tags) {
    if (!db.tags.some(x => x.id === t.id)) {
      db.tags.push(t);
    }
  }

  for (const dt of data.diagramTags) {
    if (!db.diagramTags.some(x => x.diagram_id === dt.diagram_id && x.tag_id === dt.tag_id)) {
      db.diagramTags.push(dt);
    }
  }

  if (data.userTemplates) {
    for (const ut of data.userTemplates) {
      if (!db.userTemplates.some(x => x.id === ut.id)) {
        db.userTemplates.push(ut);
      }
    }
  }

  // Import settings if present in backup
  if (data.settings) {
    // Merge settings - preserve encrypted API key from backup if available
    if (data.settings._encryptedKey) {
      db.settings._encryptedKey = data.settings._encryptedKey;
    }
    // Import other settings
    db.settings.theme = data.settings.theme;
    db.settings.language = data.settings.language;
    db.settings.ai_provider = data.settings.ai_provider;
    db.settings.ai_base_url = data.settings.ai_base_url;
    db.settings.ai_model = data.settings.ai_model;
  }

  await save(db);
  return { diagrams: dCount, folders: fCount };
}
