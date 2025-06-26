
import Dexie, { Table } from 'dexie';

export interface Recording {
  id?: number;
  title: string;
  createdAt: Date;
  duration: number;
  provider: string;
  language: string;
  summaryMD?: string;
  transcriptMD?: string;
  audioBlobHandle: string; // IDB key or file handle reference
  audioBlob?: Blob;
  processingStep?: 'transcribing' | 'summarizing' | 'completed' | 'failed';
  processingProgress?: number;
}

export interface Settings {
  id?: number;
  selectedProvider: string;
  selectedModel?: string;
  whisperModels: string[];
  hfApiKey?: string;
  openaiApiKey?: string;
  saveLocation: 'indexeddb' | 'filesystem';
  language: string;
  maxDuration: number;
  fileSystemHandle?: FileSystemDirectoryHandle;
  saveRecordings?: boolean;
  // Summary settings
  summaryProvider: 'none' | 'huggingface' | 'openai' | 'ollama' | 'lmstudio';
  summaryModel?: string;
  ollamaUrl?: string;
  lmstudioUrl?: string;
}

export interface ModelInfo {
  id?: number;
  provider: string;
  modelName: string;
  downloaded: boolean;
  sizeBytes: number;
}

export class AudioNotesDatabase extends Dexie {
  recordings!: Table<Recording>;
  settings!: Table<Settings>;
  models!: Table<ModelInfo>;
  audioBlobs!: Table<{ id: string; blob: Blob }>;

  constructor() {
    super('AudioNotesDatabase');
    this.version(1).stores({
      recordings: '++id, title, createdAt, provider, language',
      settings: '++id',
      models: '++id, provider, modelName',
      audioBlobs: 'id'
    });
  }
}

export const db = new AudioNotesDatabase();

// Initialize default settings
export const initializeDefaultSettings = async () => {
  const existingSettings = await db.settings.toArray();
  if (existingSettings.length === 0) {
    await db.settings.add({
      selectedProvider: 'openai',
      whisperModels: [],
      saveLocation: 'indexeddb',
      language: 'en',
      maxDuration: 1800, // 30 minutes
      saveRecordings: false,
      summaryProvider: 'none'
    });
  }
};
