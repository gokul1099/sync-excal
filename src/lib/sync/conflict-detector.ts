/**
 * Conflict detection logic
 */

import type { Diagram, ConflictDiagram } from '@/types/diagram';
import { compareHashes } from '@/lib/utils/crypto';
import { syncLogger } from '@/lib/utils/logger';

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: string;
  conflict?: ConflictDiagram;
}

/**
 * Check if there's a conflict between local and cloud diagrams
 */
export function detectConflict(local: Diagram, cloud: Diagram): ConflictCheckResult {
  // No conflict if hashes are the same
  if (compareHashes(local.hash, cloud.hash)) {
    return { hasConflict: false };
  }

  // Check timestamps
  const localTime = local.localTimestamp;
  const cloudTime = cloud.cloudTimestamp || 0;

  syncLogger.debug(`Conflict check: local=${localTime}, cloud=${cloudTime}`);

  // If local was modified after cloud, but hashes differ, there's a conflict
  // This means both devices modified the diagram independently
  if (localTime > cloudTime && !compareHashes(local.hash, cloud.hash)) {
    return {
      hasConflict: true,
      reason: 'Both local and cloud versions have been modified',
      conflict: {
        local,
        cloud,
        detectedAt: Date.now(),
      },
    };
  }

  // If cloud is newer and hashes differ, check if local has unsaved changes
  if (cloudTime > localTime) {
    if (local.lastSynced && local.localTimestamp > local.lastSynced) {
      // Local has unsaved changes, and cloud is newer
      return {
        hasConflict: true,
        reason: 'Cloud version is newer but local has unsaved changes',
        conflict: {
          local,
          cloud,
          detectedAt: Date.now(),
        },
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Determine which version should win based on strategy
 */
export function resolveConflict(
  conflict: ConflictDiagram,
  strategy: 'latest' | 'local' | 'cloud'
): Diagram {
  switch (strategy) {
    case 'latest':
      return conflict.local.localTimestamp > (conflict.cloud.cloudTimestamp || 0)
        ? conflict.local
        : conflict.cloud;
    case 'local':
      return conflict.local;
    case 'cloud':
      return conflict.cloud;
    default:
      return conflict.local;
  }
}
