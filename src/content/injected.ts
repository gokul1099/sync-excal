/**
 * Injected script - runs in MAIN world (page context)
 * Has full access to page's localStorage and Excalidraw data
 * Communicates with content script via window.postMessage
 */

// Type for messages sent to content script
interface ExcalidrawMessage {
  type: 'EXCALIDRAW_DATA' | 'EXCALIDRAW_INIT' | 'EXCALIDRAW_DEBUG';
  payload?: any;
}

console.log('[Excalidraw Sync] Injected script loaded in MAIN world');

// Track last hash to avoid duplicate syncs
let lastDataHash: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 3000;

/**
 * Calculate simple hash for change detection
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Get all Excalidraw-related localStorage keys with their data
 */
function getAllExcalidrawData(): Record<string, any> {
  const allKeys = Object.keys(localStorage);
  const excalidrawData: Record<string, any> = {};

  console.log('[Excalidraw Sync] Total localStorage keys:', allKeys.length);
  console.log('[Excalidraw Sync] All keys:', allKeys);

  // Get all keys that might contain Excalidraw data
  const relevantKeys = allKeys.filter(key => {
    // Look for various Excalidraw storage patterns
    return key.includes('excalidraw') ||
           key.includes('excalidraw-') ||
           key === 'excalidraw';
  });

  console.log('[Excalidraw Sync] Relevant Excalidraw keys:', relevantKeys);

  relevantKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        excalidrawData[key] = {
          raw: value,
          length: value.length,
          preview: value.substring(0, 200)
        };
      }
    } catch (error) {
      console.error(`[Excalidraw Sync] Error reading key ${key}:`, error);
    }
  });

  return excalidrawData;
}

/**
 * Extract and structure Excalidraw diagram data
 */
function extractExcalidrawDiagram(): any | null {
  try {
    const allKeys = Object.keys(localStorage);
    console.log('[Excalidraw Sync] Extracting diagram data...');
    console.log('[Excalidraw Sync] Available keys:', allKeys);

    // Excalidraw uses different storage formats:
    // 1. Modern format: Single key with full data
    // 2. Legacy format: Separate keys for elements, appState, files

    // Try to find the main data key
    let dataKey: string | null = null;
    let stateKey: string | null = null;
    let filesKey: string | null = null;

    // Look for common patterns
    for (const key of allKeys) {
      if (key === 'excalidraw') {
        dataKey = key;
      } else if (key === 'excalidraw-state') {
        stateKey = key;
      } else if (key.startsWith('excalidraw') &&
                 !key.includes('state') &&
                 !key.includes('collab') &&
                 !key.includes('theme') &&
                 !key.includes('library')) {
        // Could be a scene-specific key
        dataKey = dataKey || key;
      }
    }

    console.log('[Excalidraw Sync] Found keys:', { dataKey, stateKey, filesKey });

    if (!dataKey) {
      console.log('[Excalidraw Sync] No Excalidraw data key found');
      return null;
    }

    const rawData = localStorage.getItem(dataKey);
    if (!rawData) {
      console.log('[Excalidraw Sync] Data key exists but empty');
      return null;
    }

    console.log('[Excalidraw Sync] Raw data length:', rawData.length);
    console.log('[Excalidraw Sync] Raw data preview:', rawData.substring(0, 500));

    const parsedData = JSON.parse(rawData);
    console.log('[Excalidraw Sync] Parsed data type:', Array.isArray(parsedData) ? 'array' : typeof parsedData);

    let diagram: any;

    if (Array.isArray(parsedData)) {
      // Format 1: Array of elements (current Excalidraw format)
      console.log('[Excalidraw Sync] Detected array format, elements:', parsedData.length);

      // Get app state from separate key if exists
      let appState = {};
      if (stateKey) {
        const stateRaw = localStorage.getItem(stateKey);
        if (stateRaw) {
          appState = JSON.parse(stateRaw);
          console.log('[Excalidraw Sync] Loaded appState from separate key');
        }
      }

      diagram = {
        type: 'excalidraw',
        version: 2,
        source: window.location.href,
        elements: parsedData,
        appState: appState,
        files: {}
      };
    } else if (parsedData && typeof parsedData === 'object') {
      // Format 2: Complete object
      if (parsedData.type === 'excalidraw' || parsedData.elements) {
        console.log('[Excalidraw Sync] Detected full object format');
        diagram = parsedData;

        // Ensure required fields
        if (!diagram.type) diagram.type = 'excalidraw';
        if (!diagram.version) diagram.version = 2;
        if (!diagram.source) diagram.source = window.location.href;
        if (!diagram.appState) diagram.appState = {};
        if (!diagram.files) diagram.files = {};
      } else {
        console.log('[Excalidraw Sync] Unknown object format:', Object.keys(parsedData));
        return null;
      }
    } else {
      console.log('[Excalidraw Sync] Unsupported data format');
      return null;
    }

    // Validate diagram has elements
    if (!diagram.elements || !Array.isArray(diagram.elements)) {
      console.log('[Excalidraw Sync] No elements array found');
      return null;
    }

    const activeElements = diagram.elements.filter((e: any) => !e.isDeleted);
    console.log('[Excalidraw Sync] Total elements:', diagram.elements.length, 'Active:', activeElements.length);

    if (activeElements.length === 0) {
      console.log('[Excalidraw Sync] No active elements, skipping empty diagram');
      return null;
    }

    return diagram;
  } catch (error) {
    console.error('[Excalidraw Sync] Error extracting diagram:', error);
    return null;
  }
}

/**
 * Send diagram data to content script
 */
function sendDiagramToContentScript(diagram: any) {
  try {
    // Calculate hash
    const dataString = JSON.stringify(diagram);
    const hash = simpleHash(dataString);

    // Skip if unchanged
    if (hash === lastDataHash) {
      console.log('[Excalidraw Sync] Data unchanged, skipping');
      return;
    }

    lastDataHash = hash;

    console.log('[Excalidraw Sync] Sending diagram to content script, hash:', hash);

    // Send via postMessage
    const message: ExcalidrawMessage = {
      type: 'EXCALIDRAW_DATA',
      payload: {
        diagram,
        hash,
        url: window.location.href,
        timestamp: Date.now()
      }
    };

    window.postMessage(message, '*');
    console.log('[Excalidraw Sync] Message posted to window');
  } catch (error) {
    console.error('[Excalidraw Sync] Error sending diagram:', error);
  }
}

/**
 * Debounced check for diagram changes
 */
function checkForChanges() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    console.log('[Excalidraw Sync] Checking for diagram changes...');
    const diagram = extractExcalidrawDiagram();

    if (diagram) {
      console.log('[Excalidraw Sync] Diagram found, sending to content script');
      sendDiagramToContentScript(diagram);
    } else {
      console.log('[Excalidraw Sync] No diagram data found');
    }

    debounceTimer = null;
  }, DEBOUNCE_DELAY);
}

/**
 * Override localStorage.setItem to detect changes
 */
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key: string, value: string) {
  // Call original
  originalSetItem(key, value);

  // Check if it's an Excalidraw key
  if (key.includes('excalidraw') &&
      !key.includes('collab') &&
      !key.includes('theme') &&
      !key.includes('library')) {
    console.log('[Excalidraw Sync] localStorage changed:', key);
    checkForChanges();
  }
};

/**
 * Send initial status to content script
 */
function sendInitialStatus() {
  const allData = getAllExcalidrawData();

  const message: ExcalidrawMessage = {
    type: 'EXCALIDRAW_INIT',
    payload: {
      ready: true,
      keys: Object.keys(allData),
      dataCount: Object.keys(allData).length,
      url: window.location.href
    }
  };

  window.postMessage(message, '*');
  console.log('[Excalidraw Sync] Init message sent');
}

/**
 * Debug function - send all localStorage data
 */
function sendDebugInfo() {
  const allData = getAllExcalidrawData();

  const message: ExcalidrawMessage = {
    type: 'EXCALIDRAW_DEBUG',
    payload: {
      allKeys: Object.keys(localStorage),
      excalidrawData: allData,
      url: window.location.href
    }
  };

  window.postMessage(message, '*');
}

/**
 * Expose debug functions to window
 */
(window as any).excalidrawSyncDebug = {
  getAllData: getAllExcalidrawData,
  extractDiagram: extractExcalidrawDiagram,
  forceCheck: checkForChanges,
  sendDebug: sendDebugInfo,
  getLastHash: () => lastDataHash
};

/**
 * Listen for trigger messages from content script
 */
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.source !== window) {
    return;
  }

  const message = event.data;

  if (message && message.type === 'TRIGGER_SYNC') {
    console.log('[Excalidraw Sync] Manual sync triggered from content script');
    checkForChanges();
  } else if (message && message.type === 'TRIGGER_DEBUG') {
    console.log('[Excalidraw Sync] Debug info requested from content script');
    sendDebugInfo();
  }
});

// Initialize
console.log('[Excalidraw Sync] Initializing injected script...');
sendInitialStatus();

// Check for existing data after a delay (wait for page to load)
setTimeout(() => {
  console.log('[Excalidraw Sync] Initial check for existing data...');
  checkForChanges();
}, 2000);

// Periodic check as backup (every 30 seconds)
setInterval(() => {
  console.log('[Excalidraw Sync] Periodic check...');
  checkForChanges();
}, 30000);

console.log('[Excalidraw Sync] Injected script initialization complete');
console.log('[Excalidraw Sync] Debug tools available at: window.excalidrawSyncDebug');
