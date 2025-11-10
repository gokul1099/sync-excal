export type SyncOperation = 'upload' | 'download' | 'delete';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'synced';

export type ConflictResolution = 'manual' | 'latest' | 'local' | 'cloud';

export interface SyncQueueItem {
  id: string;
  diagramId: string;
  operation: SyncOperation;
  priority: number;
  retryCount: number;
  maxRetries: number;
  addedAt: number;
  error?: string;
}

export interface SyncState {
  status: SyncStatus;
  lastSync: number | null;
  syncInProgress: boolean;
  queueLength: number;
  error: string | null;
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // milliseconds
  conflictResolution: ConflictResolution;
  maxRetries: number;
  retryDelay: number; // milliseconds
}

export interface SyncEvent {
  type: 'sync_start' | 'sync_complete' | 'sync_error' | 'conflict_detected';
  diagramId?: string;
  timestamp: number;
  data?: any;
}
