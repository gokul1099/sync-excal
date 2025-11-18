/**
 * IndexedDB storage layer using Dexie
 */

import Dexie, { Table } from 'dexie';
import type { Diagram, DiagramMetadata, ConflictDiagram } from '@/types/diagram';
import type { SyncQueueItem, SyncSettings } from '@/types/sync';
import { generateDeviceId } from '@/lib/utils/crypto';

export interface StoredSettings {
  key: string;
  value: any;
}

class ExcalidrawSyncDatabase extends Dexie {
  diagrams!: Table<Diagram, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  conflicts!: Table<ConflictDiagram, string>;
  settings!: Table<StoredSettings, string>;

  constructor() {
    super('ExcalidrawSyncDB');

    this.version(1).stores({
      diagrams: 'id, name, hash, localTimestamp, cloudTimestamp, lastSynced, isSyncing',
      syncQueue: 'id, diagramId, operation, priority, addedAt',
      conflicts: 'local.id',
      settings: 'key',
    });
  }

  // Diagram operations
  async saveDiagram(diagram: Diagram): Promise<void> {
    await this.diagrams.put(diagram);
  }

  async getDiagram(id: string): Promise<Diagram | undefined> {
    return await this.diagrams.get(id);
  }

  async getAllDiagrams(): Promise<Diagram[]> {
    return await this.diagrams.toArray();
  }

  async getDiagramMetadata(): Promise<DiagramMetadata[]> {
    const diagrams = await this.diagrams.toArray();
    return diagrams.map((d) => {
      const { data, ...metadata } = d;
      return metadata;
    });
  }

  async deleteDiagram(id: string): Promise<void> {
    await this.diagrams.delete(id);
  }

  async updateDiagramMetadata(id: string, updates: Partial<DiagramMetadata>): Promise<void> {
    await this.diagrams.update(id, updates);
  }

  // Sync queue operations
  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    await this.syncQueue.put(item);
  }

  async getNextSyncItem(): Promise<SyncQueueItem | undefined> {
    return await this.syncQueue.orderBy('priority').reverse().first();
  }

  async removeSyncItem(id: string): Promise<void> {
    await this.syncQueue.delete(id);
  }

  async getAllSyncItems(): Promise<SyncQueueItem[]> {
    return await this.syncQueue.toArray();
  }

  async clearSyncQueue(): Promise<void> {
    await this.syncQueue.clear();
  }

  // Conflict operations
  async saveConflict(conflict: ConflictDiagram): Promise<void> {
    await this.conflicts.put(conflict);
  }

  async getConflict(diagramId: string): Promise<ConflictDiagram | undefined> {
    return await this.conflicts.get(diagramId);
  }

  async getAllConflicts(): Promise<ConflictDiagram[]> {
    return await this.conflicts.toArray();
  }

  async resolveConflict(diagramId: string): Promise<void> {
    await this.conflicts.delete(diagramId);
  }

  // Settings operations
  async saveSetting<T>(key: string, value: T): Promise<void> {
    await this.settings.put({ key, value });
  }

  async getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const setting = await this.settings.get(key);
    return setting ? setting.value : defaultValue;
  }

  async deleteSetting(key: string): Promise<void> {
    await this.settings.delete(key);
  }
}

// Create singleton instance
export const db = new ExcalidrawSyncDatabase();

// Default sync settings
export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  autoSync: true,
  syncInterval: 300000, // 5 minutes
  conflictResolution: 'manual',
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
};

// Helper functions
export async function getSyncSettings(): Promise<SyncSettings> {
  const settings = await db.getSetting<SyncSettings>('syncSettings');
  return settings || DEFAULT_SYNC_SETTINGS;
}

export async function saveSyncSettings(settings: Partial<SyncSettings>): Promise<void> {
  const current = await getSyncSettings();
  await db.saveSetting('syncSettings', { ...current, ...settings });
}

export async function getDeviceId(): Promise<string> {
  let deviceId = await db.getSetting<string>('deviceId');
  if (!deviceId) {
    // Generate new device ID
    deviceId = await generateDeviceId();
    await db.saveSetting('deviceId', deviceId);
  }
  return deviceId;
}
