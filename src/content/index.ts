/**
 * Content script - runs on Excalidraw pages
 * Monitors localStorage for diagram changes and communicates with background
 */

import { contentLogger } from '@/lib/utils/logger';
import { sendToBackground } from '@/lib/utils/messaging';
import { isValidExcalidrawData } from '@/lib/utils/validators';
import { calculateHash } from '@/lib/utils/crypto';
import type { ExcalidrawData } from '@/types/diagram';

let lastDiagramHash: string | null = null;
let debounceTimer: number | null = null;
const DEBOUNCE_DELAY = 3000; // 3 seconds

/**
 * Extract Excalidraw data from localStorage
 */
function getExcalidrawData(): ExcalidrawData | null {
  try {
    // Excalidraw stores data in localStorage with different formats:
    // Format 1: Direct array in 'excalidraw' key (current Excalidraw)
    // Format 2: Full object with type/version/elements (exported files)

    const keys = Object.keys(localStorage);
    contentLogger.debug('All localStorage keys:', keys.length);

    // Find the main data key (not state, collab, theme, etc.)
    const excalidrawKey = keys.find((key) =>
      key === 'excalidraw' ||
      (key.startsWith('excalidraw') && !key.includes('state') && !key.includes('collab') && !key.includes('theme'))
    );
    contentLogger.debug('Found excalidraw key:', excalidrawKey || 'none');

    if (!excalidrawKey) {
      contentLogger.debug('No Excalidraw data found in localStorage');
      return null;
    }

    const rawData = localStorage.getItem(excalidrawKey);
    if (!rawData) {
      contentLogger.warn('Excalidraw key exists but no data');
      return null;
    }

    contentLogger.debug('Raw data length:', rawData.length);
    const parsedData = JSON.parse(rawData);

    // Check if it's an array (current Excalidraw format) or object (export format)
    let data: ExcalidrawData;

    if (Array.isArray(parsedData)) {
      // Format 1: Direct array of elements
      contentLogger.info('Detected array format (current Excalidraw)');
      contentLogger.debug('Elements count:', parsedData.length);

      // Get app state from separate key
      const stateRaw = localStorage.getItem('excalidraw-state');
      const appState = stateRaw ? JSON.parse(stateRaw) : {};

      // Construct proper Excalidraw data structure
      data = {
        type: 'excalidraw',
        version: 2,
        source: 'https://excalidraw.com',
        elements: parsedData,
        appState: appState,
        files: {} // Files are stored separately if present
      };
    } else if (parsedData.type === 'excalidraw') {
      // Format 2: Already in correct format
      contentLogger.info('Detected full object format');
      contentLogger.debug('Elements count:', parsedData.elements?.length || 0);
      data = parsedData;
    } else {
      contentLogger.warn('Unknown data format');
      contentLogger.debug('Data structure:', Object.keys(parsedData));
      return null;
    }

    // Skip validation if we constructed it ourselves, otherwise validate
    if (!Array.isArray(parsedData) && !isValidExcalidrawData(data)) {
      contentLogger.warn('Invalid Excalidraw data format');
      return null;
    }

    contentLogger.info('✅ Valid Excalidraw data extracted');
    return data;
  } catch (error) {
    contentLogger.error('Error extracting Excalidraw data:', error);
    return null;
  }
}

/**
 * Generate diagram name from data or URL
 */
function generateDiagramName(data: ExcalidrawData): string {
  // Try to extract name from URL or data
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  const roomId = urlParams.get('room');

  if (roomId) {
    return `Excalidraw - ${roomId}`;
  }

  // Use timestamp or element count
  const elementCount = data.elements.filter((e) => !e.isDeleted).length;
  const timestamp = new Date().toISOString().split('T')[0];
  return `Diagram ${timestamp} (${elementCount} elements)`;
}

/**
 * Send diagram to background for syncing
 */
async function syncDiagram(data: ExcalidrawData) {
  try {
    const hash = await calculateHash(data);

    // Skip if diagram hasn't changed
    if (hash === lastDiagramHash) {
      contentLogger.debug('Diagram unchanged, skipping sync');
      return;
    }

    lastDiagramHash = hash;

    const name = generateDiagramName(data);
    const diagramId = crypto.randomUUID();

    contentLogger.info(`Diagram changed, queuing sync: ${name}`);

    await sendToBackground('DIAGRAM_CHANGED', {
      diagramId,
      name,
      data,
      hash,
      url: window.location.href,
    });

    contentLogger.info('Diagram change sent to background');
  } catch (error) {
    contentLogger.error('Error syncing diagram:', error);
  }
}

/**
 * Debounced diagram sync
 */
function debouncedSync() {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    const data = getExcalidrawData();
    if (data) {
      syncDiagram(data);
    }
    debounceTimer = null;
  }, DEBOUNCE_DELAY);
}

/**
 * Monitor localStorage changes
 */
function monitorLocalStorage() {
  // Override localStorage.setItem to detect changes
  const originalSetItem = localStorage.setItem;

  localStorage.setItem = function (key: string, value: string) {
    // Call original method
    originalSetItem.call(this, key, value);

    // Check if it's an Excalidraw key
    if (key.startsWith('excalidraw') && !key.includes('state')) {
      contentLogger.info('🔔 Excalidraw localStorage changed! Key:', key);
      debouncedSync();
    }
  };

  contentLogger.info('✅ localStorage monitoring started');
  contentLogger.info('Monitoring for keys starting with "excalidraw"');
}

/**
 * Check if we're on an Excalidraw page
 */
function isExcalidrawPage(): boolean {
  // Check for Excalidraw-specific elements in the DOM
  const excalidrawRoot =
    document.querySelector('.excalidraw') || document.querySelector('[data-testid="canvas"]');
  console.log("Is excalidraw", excalidrawRoot)
  return !!excalidrawRoot;
}

/**
 * Add visual indicator that content script is active
 */
function addDebugIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'excalidraw-sync-indicator';
  indicator.textContent = '🔄 Sync Active';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 600;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(indicator);

  // Fade in
  setTimeout(() => {
    indicator.style.opacity = '1';
  }, 100);

  // Fade out after 3 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => indicator.remove(), 300);
  }, 3000);
}

/**
 * Expose debug functions to window for manual testing
 */
function exposeDebugFunctions() {
  (window as any).excalidrawSync = {
    getLocalStorage: () => {
      const keys = Object.keys(localStorage);
      const excalidrawKeys = keys.filter(k => k.includes('excalidraw'));
      console.log('All localStorage keys:', keys);
      console.log('Excalidraw keys:', excalidrawKeys);
      return excalidrawKeys.map(key => ({
        key,
        valueLength: localStorage.getItem(key)?.length || 0,
        preview: (localStorage.getItem(key) || '').substring(0, 100)
      }));
    },
    getData: () => {
      const data = getExcalidrawData();
      console.log('Extracted Excalidraw data:', data);
      return data;
    },
    forceSync: () => {
      const data = getExcalidrawData();
      if (data) {
        syncDiagram(data);
        console.log('✅ Manual sync triggered');
      } else {
        console.warn('⚠️ No diagram data found');
      }
    },
    status: () => {
      console.log('Content script status:', {
        url: window.location.href,
        isExcalidrawPage: isExcalidrawPage(),
        lastHash: lastDiagramHash,
        localStorageKeys: Object.keys(localStorage).filter(k => k.includes('excalidraw'))
      });
    }
  };

  console.log(
    '%c🔄 Excalidraw Sync Debug Tools',
    'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;'
  );
  console.log('Available commands:');
  console.log('  window.excalidrawSync.getLocalStorage() - View localStorage data');
  console.log('  window.excalidrawSync.getData() - Extract current diagram');
  console.log('  window.excalidrawSync.forceSync() - Force sync now');
  console.log('  window.excalidrawSync.status() - Show status');
}

/**
 * Verify Chrome extension APIs are available
 */
function verifyChromeAPIs(): boolean {
  const checks = {
    'chrome': typeof chrome !== 'undefined',
    'chrome.runtime': typeof chrome?.runtime !== 'undefined',
    'chrome.runtime.id': chrome?.runtime?.id !== undefined,
    'chrome.runtime.sendMessage': typeof chrome?.runtime?.sendMessage === 'function',
  };

  console.log('Chrome API availability:', checks);

  const allAvailable = Object.values(checks).every(v => v === true);

  if (!allAvailable) {
    console.error('❌ Chrome extension APIs not fully available!');
    console.error('This usually means:');
    console.error('  1. Extension is not loaded in chrome://extensions/');
    console.error('  2. Extension was disabled or removed');
    console.error('  3. Page needs to be refreshed after loading extension');
    console.error('\nReload the extension and refresh this page.');
  }

  return allAvailable;
}

/**
 * Initialize content script
 */
function initialize() {
  contentLogger.info('Content script initialize() called');
  contentLogger.info('Current URL:', window.location.href);

  // First, verify Chrome APIs are available
  if (!verifyChromeAPIs()) {
    console.error('⚠️ Cannot initialize: Chrome extension APIs unavailable');
    return;
  }

  if (!isExcalidrawPage()) {
    contentLogger.warn('Not an Excalidraw page, content script inactive');
    contentLogger.info('Page hostname:', window.location.hostname);
    return;
  }

  contentLogger.info('✅ Excalidraw page detected, initializing content script');

  // Add visual indicator
  addDebugIndicator();

  // Expose debug functions
  exposeDebugFunctions();

  // Check localStorage immediately
  const keys = Object.keys(localStorage);
  contentLogger.info('localStorage keys:', keys);
  const excalidrawKeys = keys.filter(k => k.includes('excalidraw'));
  contentLogger.info('Excalidraw keys found:', excalidrawKeys);

  // Start monitoring
  monitorLocalStorage();

  // Initial sync check - try multiple times as page loads
  let attempts = 0;
  const maxAttempts = 5;

  const tryInitialSync = () => {
    attempts++;
    contentLogger.info(`Initial sync attempt ${attempts}/${maxAttempts}`);

    const data = getExcalidrawData();
    if (data) {
      contentLogger.info('✅ Initial diagram found!');
      syncDiagram(data);
    } else {
      contentLogger.warn('No diagram data found yet');
      if (attempts < maxAttempts) {
        setTimeout(tryInitialSync, 2000);
      }
    }
  };

  setTimeout(tryInitialSync, 2000); // Wait for page to fully load

  // Periodic check (backup for missed events)
  setInterval(() => {
    const data = getExcalidrawData();
    if (data) {
      syncDiagram(data);
    }
  }, 30000); // Check every 30 seconds
}

// Run on page load
if (document.readyState === 'loading') {
  contentLogger.info('Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  contentLogger.info('Document already loaded, initializing immediately');
  initialize();
}

contentLogger.info('Content script loaded');
