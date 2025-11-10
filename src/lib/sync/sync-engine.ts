/**
 * Core sync engine
 */

import type { Diagram } from '@/types/diagram';
import type { SyncQueueItem, SyncStatus } from '@/types/sync';
import { db, getSyncSettings, getDeviceId } from '@/lib/storage/db';
import { SupabaseProvider } from '@/lib/cloud/supabase-provider';
import { detectConflict, resolveConflict } from './conflict-detector';
import { calculateHash } from '@/lib/utils/crypto';
import { syncLogger } from '@/lib/utils/logger';
import { sendToAllTabs } from '@/lib/utils/messaging';

export class SyncEngine {
  private provider: SupabaseProvider;
  private syncStatus: SyncStatus = 'idle';
  private syncInProgress: boolean = false;

  constructor() {
    this.provider = new SupabaseProvider();

    // Listen for realtime changes from cloud
    this.provider.onSync(async (diagram) => {
      await this.handleCloudUpdate(diagram);
    });
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Sync a specific diagram
   */
  async syncDiagram(diagram: Diagram): Promise<void> {
    try {
      const deviceId = await getDeviceId();

      // Calculate hash if not already set
      if (!diagram.hash) {
        diagram.hash = await calculateHash(diagram.data);
      }

      // Set device ID
      diagram.deviceId = deviceId;

      // Check if diagram exists in cloud
      const cloudDiagram = await this.provider.downloadDiagram(diagram.id);

      if (cloudDiagram) {
        // Check for conflicts
        const conflictCheck = detectConflict(diagram, cloudDiagram);

        if (conflictCheck.hasConflict && conflictCheck.conflict) {
          syncLogger.warn(`Conflict detected for diagram: ${diagram.name}`);

          // Save conflict for user to resolve
          await db.saveConflict(conflictCheck.conflict);
          await db.updateDiagramMetadata(diagram.id, { conflictStatus: 'conflict' });

          // Get conflict resolution strategy
          const settings = await getSyncSettings();

          if (settings.conflictResolution !== 'manual') {
            // Auto-resolve conflict
            const resolved = resolveConflict(conflictCheck.conflict, settings.conflictResolution);
            await this.applyResolvedDiagram(resolved);
            await db.resolveConflict(diagram.id);
          }

          return;
        }

        // No conflict, check which version is newer
        if (diagram.hash !== cloudDiagram.hash) {
          if (diagram.localTimestamp > (cloudDiagram.cloudTimestamp || 0)) {
            // Local is newer, upload
            await this.uploadDiagram(diagram);
          } else {
            // Cloud is newer, download and apply
            await this.applyCloudDiagram(cloudDiagram);
          }
        }
      } else {
        // Diagram doesn't exist in cloud, upload it
        await this.uploadDiagram(diagram);
      }
    } catch (error) {
      syncLogger.error(`Error syncing diagram: ${error}`);
      throw error;
    }
  }

  /**
   * Upload diagram to cloud
   */
  private async uploadDiagram(diagram: Diagram): Promise<void> {
    syncLogger.info(`Uploading diagram: ${diagram.name}`);

    // Mark as syncing
    await db.updateDiagramMetadata(diagram.id, { isSyncing: true });

    try {
      await this.provider.uploadDiagram(diagram);

      // Update metadata
      await db.updateDiagramMetadata(diagram.id, {
        isSyncing: false,
        lastSynced: Date.now(),
        cloudId: diagram.id,
        cloudTimestamp: Date.now(),
      });

      syncLogger.info(`Successfully uploaded diagram: ${diagram.name}`);
    } catch (error) {
      await db.updateDiagramMetadata(diagram.id, { isSyncing: false });
      throw error;
    }
  }

  /**
   * Apply cloud diagram to local storage
   */
  private async applyCloudDiagram(diagram: Diagram): Promise<void> {
    syncLogger.info(`Applying cloud diagram: ${diagram.name}`);

    // Save to local storage
    await db.saveDiagram(diagram);

    // Notify content scripts to update if diagram is open
    await sendToAllTabs('DIAGRAM_UPDATED', { diagramId: diagram.id, data: diagram.data });
  }

  /**
   * Apply resolved diagram after conflict resolution
   */
  private async applyResolvedDiagram(diagram: Diagram): Promise<void> {
    syncLogger.info(`Applying resolved diagram: ${diagram.name}`);

    // Save locally
    await db.saveDiagram(diagram);

    // Upload to cloud
    await this.uploadDiagram(diagram);

    // Update conflict status
    await db.updateDiagramMetadata(diagram.id, { conflictStatus: 'resolved' });
  }

  /**
   * Handle incoming cloud update (from realtime)
   */
  private async handleCloudUpdate(cloudDiagram: Diagram): Promise<void> {
    syncLogger.info(`Received cloud update: ${cloudDiagram.name}`);

    // Get local version if exists
    const localDiagram = await db.getDiagram(cloudDiagram.id);

    if (localDiagram) {
      // Check for conflict
      const conflictCheck = detectConflict(localDiagram, cloudDiagram);

      if (conflictCheck.hasConflict && conflictCheck.conflict) {
        syncLogger.warn(`Conflict detected for diagram: ${cloudDiagram.name}`);
        await db.saveConflict(conflictCheck.conflict);
        await db.updateDiagramMetadata(cloudDiagram.id, { conflictStatus: 'conflict' });
        return;
      }
    }

    // No conflict, apply cloud version
    await this.applyCloudDiagram(cloudDiagram);
  }

  /**
   * Sync all diagrams
   */
  async syncAll(): Promise<void> {
    if (this.syncInProgress) {
      syncLogger.warn('Sync already in progress');
      return;
    }

    this.syncInProgress = true;
    this.syncStatus = 'syncing';

    try {
      syncLogger.info('Starting full sync');

      // Get all local diagrams
      const localDiagrams = await db.getAllDiagrams();
      syncLogger.info(`Found ${localDiagrams.length} local diagrams`);

      // Get all cloud diagrams
      const cloudMetadata = await this.provider.listDiagrams();
      syncLogger.info(`Found ${cloudMetadata.length} cloud diagrams`);

      // Create maps for easy lookup
      const localMap = new Map(localDiagrams.map((d) => [d.id, d]));
      const cloudMap = new Map(cloudMetadata.map((d) => [d.id, d]));

      // Upload diagrams that are only local or modified locally
      for (const local of localDiagrams) {
        const cloud = cloudMap.get(local.id);

        if (!cloud) {
          // Only in local, upload
          await this.uploadDiagram(local);
        } else if (local.hash !== cloud.hash) {
          // Modified, sync
          const cloudFull = await this.provider.downloadDiagram(local.id);
          if (cloudFull) {
            const conflictCheck = detectConflict(local, cloudFull);
            if (!conflictCheck.hasConflict) {
              if (local.localTimestamp > (cloud.cloudTimestamp || 0)) {
                await this.uploadDiagram(local);
              } else {
                await this.applyCloudDiagram(cloudFull);
              }
            }
          }
        }
      }

      // Download diagrams that are only in cloud
      for (const cloud of cloudMetadata) {
        if (!localMap.has(cloud.id)) {
          const cloudFull = await this.provider.downloadDiagram(cloud.id);
          if (cloudFull) {
            await this.applyCloudDiagram(cloudFull);
          }
        }
      }

      this.syncStatus = 'synced';
      syncLogger.info('Full sync completed');
    } catch (error) {
      this.syncStatus = 'error';
      syncLogger.error(`Sync failed: ${error}`);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process sync queue
   */
  async processSyncQueue(): Promise<void> {
    const items = await db.getAllSyncItems();

    for (const item of items) {
      try {
        syncLogger.info(`Processing sync queue item: ${item.operation} for ${item.diagramId}`);

        const diagram = await db.getDiagram(item.diagramId);
        if (!diagram) {
          syncLogger.warn(`Diagram not found: ${item.diagramId}`);
          await db.removeSyncItem(item.id);
          continue;
        }

        switch (item.operation) {
          case 'upload':
            await this.uploadDiagram(diagram);
            break;
          case 'download':
            const cloudDiagram = await this.provider.downloadDiagram(diagram.id);
            if (cloudDiagram) {
              await this.applyCloudDiagram(cloudDiagram);
            }
            break;
          case 'delete':
            await this.provider.deleteDiagram(diagram.id);
            await db.deleteDiagram(diagram.id);
            break;
        }

        // Remove from queue
        await db.removeSyncItem(item.id);
      } catch (error) {
        syncLogger.error(`Error processing queue item: ${error}`);

        // Increment retry count
        const settings = await getSyncSettings();
        if (item.retryCount >= settings.maxRetries) {
          syncLogger.error(`Max retries reached for queue item: ${item.id}`);
          await db.removeSyncItem(item.id);
        } else {
          // Will retry on next run
        }
      }
    }
  }

  /**
   * Add diagram to sync queue
   */
  async queueSync(diagramId: string, operation: 'upload' | 'download' | 'delete'): Promise<void> {
    const settings = await getSyncSettings();

    const queueItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      diagramId,
      operation,
      priority: operation === 'delete' ? 10 : 5,
      retryCount: 0,
      maxRetries: settings.maxRetries,
      addedAt: Date.now(),
    };

    await db.addToSyncQueue(queueItem);
    syncLogger.info(`Added to sync queue: ${operation} for ${diagramId}`);
  }
}
