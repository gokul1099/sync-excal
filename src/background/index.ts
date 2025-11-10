/**
 * Background service worker
 * Handles sync operations, scheduling, and communication
 */

// Polyfills for service worker environment
// Service workers don't have window, document, localStorage, BroadcastChannel, etc.
// Add comprehensive polyfills for libraries that check for these

if (typeof window === 'undefined') {
  const eventListeners = new Map<string, Set<Function>>();

  // Create comprehensive window mock
  const windowMock = {
    addEventListener: (event: string, handler: Function) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add(handler);
    },
    removeEventListener: (event: string, handler: Function) => {
      if (eventListeners.has(event)) {
        eventListeners.get(event)!.delete(handler);
      }
    },
    dispatchEvent: (event: any) => {
      const handlers = eventListeners.get(event.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error('Error in event handler:', error);
          }
        });
      }
      return true;
    },
    location: {
      href: 'chrome-extension://' + (chrome?.runtime?.id || 'unknown'),
      origin: 'chrome-extension://' + (chrome?.runtime?.id || 'unknown'),
      protocol: 'chrome-extension:',
      host: chrome?.runtime?.id || 'unknown',
      hostname: chrome?.runtime?.id || 'unknown',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
    },
    navigator: {
      userAgent: 'Chrome Extension Service Worker',
      platform: 'Chrome Extension',
      language: 'en-US',
      onLine: true,
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    fetch,
    crypto,
    CustomEvent: class CustomEvent {
      constructor(public type: string, public detail?: any) {}
    },
    Event: class Event {
      constructor(public type: string, public options?: any) {}
    },
  };

  // Assign window to globalThis
  (globalThis as any).window = Object.assign(globalThis, windowMock);

  // Mock document
  (globalThis as any).document = {
    addEventListener: windowMock.addEventListener,
    removeEventListener: windowMock.removeEventListener,
    dispatchEvent: windowMock.dispatchEvent,
    createElement: () => ({}),
    createEvent: (type: string) => ({
      type,
      initEvent: () => {},
    }),
  };

  // Mock localStorage and sessionStorage
  (globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };

  (globalThis as any).sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };
}

// Mock BroadcastChannel for cross-tab communication (Supabase uses this)
if (typeof BroadcastChannel === 'undefined') {
  (globalThis as any).BroadcastChannel = class BroadcastChannel {
    private listeners = new Set<Function>();

    constructor(public name: string) {}

    postMessage(_message: any) {
      // In service worker, we can't communicate with other contexts via BroadcastChannel
      // This is a no-op mock
    }

    close() {
      this.listeners.clear();
    }

    addEventListener(event: string, handler: Function) {
      if (event === 'message') {
        this.listeners.add(handler);
      }
    }

    removeEventListener(event: string, handler: Function) {
      if (event === 'message') {
        this.listeners.delete(handler);
      }
    }

    set onmessage(handler: Function | null) {
      if (handler) {
        this.listeners.add(handler);
      }
    }
  };
}

import { backgroundLogger } from '@/lib/utils/logger';
import { onMessageType } from '@/lib/utils/messaging';
import { initializeSupabase, isAuthenticated } from '@/lib/supabase/client';
import { SyncEngine } from '@/lib/sync/sync-engine';
import { db, getSyncSettings, getDeviceId } from '@/lib/storage/db';
import type { Diagram } from '@/types/diagram';

let syncEngine: SyncEngine | null = null;

/**
 * Initialize the background service worker
 */
async function initialize() {
  backgroundLogger.info('Background service worker starting...');

  try {
    // Initialize Supabase
    await initializeSupabase();

    // Check if user is authenticated
    const authenticated = await isAuthenticated();

    if (authenticated) {
      backgroundLogger.info('User is authenticated, initializing sync engine');

      // Initialize sync engine
      syncEngine = new SyncEngine();

      // Set up periodic sync
      await setupPeriodicSync();

      // Process any pending sync queue items
      await syncEngine.processSyncQueue();

      // Do initial sync
      await syncEngine.syncAll();
    } else {
      backgroundLogger.info('User not authenticated, sync disabled');
    }
  } catch (error) {
    backgroundLogger.error('Error initializing background:', error);
  }
}

/**
 * Set up periodic sync using Chrome alarms
 */
async function setupPeriodicSync() {
  const settings = await getSyncSettings();

  // Clear existing alarm
  await chrome.alarms.clear('periodic-sync');

  // Create new alarm
  await chrome.alarms.create('periodic-sync', {
    periodInMinutes: settings.syncInterval / 60000, // Convert ms to minutes
  });

  backgroundLogger.info(`Periodic sync scheduled every ${settings.syncInterval / 60000} minutes`);
}

/**
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'periodic-sync') {
    backgroundLogger.info('Periodic sync triggered');

    if (syncEngine) {
      try {
        await syncEngine.syncAll();
        backgroundLogger.info('Periodic sync completed');
      } catch (error) {
        backgroundLogger.error('Periodic sync failed:', error);
      }
    }
  }
});

/**
 * Handle diagram changes from content script
 */
onMessageType('DIAGRAM_CHANGED', async (payload) => {
  backgroundLogger.info('Diagram change received from content script');

  try {
    const { diagramId, name, data, hash } = payload;
    const deviceId = await getDeviceId();

    // Check if diagram already exists in local storage
    let existingDiagram = await db.getDiagram(diagramId);

    if (!existingDiagram) {
      // Try to find by hash (might be the same diagram with different ID)
      const allDiagrams = await db.getAllDiagrams();
      existingDiagram = allDiagrams.find((d) => d.hash === hash);
    }

    const diagram: Diagram = {
      id: existingDiagram?.id || diagramId,
      name: existingDiagram?.name || name,
      data,
      hash,
      localTimestamp: Date.now(),
      cloudTimestamp: existingDiagram?.cloudTimestamp || null,
      cloudId: existingDiagram?.cloudId || null,
      lastSynced: existingDiagram?.lastSynced || null,
      isSyncing: false,
      conflictStatus: 'none',
      deviceId,
      size: JSON.stringify(data).length,
    };

    // ALWAYS save to local storage (even if not authenticated)
    await db.saveDiagram(diagram);
    backgroundLogger.info(`Diagram saved locally: ${diagram.name}`);

    // Check authentication status for cloud sync
    const authenticated = await isAuthenticated();

    if (!authenticated) {
      backgroundLogger.warn('User not authenticated - diagram saved locally but not synced to cloud');
      backgroundLogger.info('Sign in via Options page to enable cloud sync');

      // Update badge to show local save
      await chrome.action.setBadgeText({ text: '💾' });
      await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
      setTimeout(async () => {
        await chrome.action.setBadgeText({ text: '' });
      }, 2000);

      return;
    }

    if (!syncEngine) {
      backgroundLogger.warn('Sync engine not initialized - diagram saved locally, will sync when engine starts');
      return;
    }

    // Queue for cloud sync
    await syncEngine.queueSync(diagram.id, 'upload');

    // Process queue
    await syncEngine.processSyncQueue();

    backgroundLogger.info(`Diagram synced to cloud: ${diagram.name}`);

    // Update badge to show successful sync
    await chrome.action.setBadgeText({ text: '✓' });
    await chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    setTimeout(async () => {
      await chrome.action.setBadgeText({ text: '' });
    }, 2000);
  } catch (error) {
    backgroundLogger.error('Error handling diagram change:', error);

    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }
});

/**
 * Handle manual sync requests
 */
onMessageType('SYNC_NOW', async () => {
  backgroundLogger.info('Manual sync requested');

  if (!syncEngine) {
    backgroundLogger.error('Sync engine not initialized');
    return { success: false, error: 'Sync engine not initialized' };
  }

  try {
    backgroundLogger.info('Starting manual sync...');
    await syncEngine.syncAll();
    backgroundLogger.info('Manual sync completed successfully');
    return { success: true };
  } catch (error) {
    backgroundLogger.error('Manual sync failed:', error);
    return { success: false, error: String(error) };
  }
});

/**
 * Handle sync status requests
 */
onMessageType('GET_SYNC_STATUS', async () => {
  if (!syncEngine) {
    return {
      status: 'idle',
      lastSync: null,
      syncInProgress: false,
      queueLength: 0,
      error: null,
    };
  }

  const queueItems = await db.getAllSyncItems();

  return {
    status: syncEngine.getSyncStatus(),
    lastSync: null, // TODO: Track this
    syncInProgress: false,
    queueLength: queueItems.length,
    error: null,
  };
});

/**
 * Handle get diagrams requests
 */
onMessageType('GET_DIAGRAMS', async () => {
  try {
    const diagrams = await db.getDiagramMetadata();
    return { diagrams };
  } catch (error) {
    backgroundLogger.error('Error getting diagrams:', error);
    return { diagrams: [] };
  }
});

/**
 * Handle diagram deletion
 */
onMessageType('DIAGRAM_DELETED', async (payload) => {
  const { diagramId } = payload;

  try {
    // Delete from local storage
    await db.deleteDiagram(diagramId);

    // Queue for cloud deletion if authenticated
    if (syncEngine && (await isAuthenticated())) {
      await syncEngine.queueSync(diagramId, 'delete');
      await syncEngine.processSyncQueue();
    }

    return { success: true };
  } catch (error) {
    backgroundLogger.error('Error deleting diagram:', error);
    return { success: false, error: String(error) };
  }
});

/**
 * Handle auth state changes (sign in/out)
 */
onMessageType('AUTH_STATE_CHANGED', async (payload) => {
  const { authenticated } = payload;

  if (authenticated) {
    backgroundLogger.info('User signed in, initializing sync engine');

    // Initialize sync engine
    syncEngine = new SyncEngine();

    // Set up periodic sync
    await setupPeriodicSync();

    // Sync all locally saved diagrams
    const localDiagrams = await db.getAllDiagrams();
    backgroundLogger.info(`Found ${localDiagrams.length} local diagrams to sync`);

    if (localDiagrams.length > 0) {
      await syncEngine.syncAll();
      backgroundLogger.info('All local diagrams synced to cloud');
    }
  } else {
    backgroundLogger.info('User signed out, disabling sync engine');
    syncEngine = null;

    // Clear periodic sync
    await chrome.alarms.clear('periodic-sync');
  }
});

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    backgroundLogger.info('Extension installed');
    // Open options page for first-time setup
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    backgroundLogger.info('Extension updated');
  }
});

// Initialize on load
initialize();

backgroundLogger.info('Background service worker loaded');
