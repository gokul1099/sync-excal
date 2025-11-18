/**
 * Content script - runs in ISOLATED world
 * Injects script into MAIN world and communicates via postMessage
 * Forwards Excalidraw data to background service worker
 */

import { contentLogger } from '@/lib/utils/logger';
import { sendToBackground } from '@/lib/utils/messaging';
import { calculateHash } from '@/lib/utils/crypto';
import type { ExcalidrawData } from '@/types/diagram';

// Track state
let isInitialized = false;
let lastSyncedHash: string | null = null;

/**
 * Check if we're on an Excalidraw page
 */
function isExcalidrawPage(): boolean {
  // Check URL
  const isExcalidrawDomain = window.location.hostname === 'excalidraw.com' ||
                             window.location.hostname.endsWith('.excalidraw.com') ||
                             window.location.hostname === 'localhost';

  if (!isExcalidrawDomain) {
    return false;
  }

  // Check for Excalidraw-specific elements in the DOM
  const hasExcalidrawUI = !!(
    document.querySelector('.excalidraw') ||
    document.querySelector('[data-testid="canvas"]') ||
    document.querySelector('.excalidraw__canvas')
  );

  contentLogger.info('Excalidraw page check:', {
    domain: isExcalidrawDomain,
    hasUI: hasExcalidrawUI,
    url: window.location.href
  });

  return isExcalidrawDomain || hasExcalidrawUI;
}

/**
 * Generate diagram name from data or URL
 */
function generateDiagramName(data: ExcalidrawData): string {
  try {
    // Try to extract name from URL hash (room ID for collaborative sessions)
    const hash = window.location.hash;
    if (hash && hash.includes('room')) {
      const urlParams = new URLSearchParams(hash.substring(1));
      const roomId = urlParams.get('room');
      if (roomId) {
        return `Excalidraw - ${roomId.substring(0, 8)}`;
      }
    }

    // Try to extract from URL path
    const path = window.location.pathname;
    if (path && path !== '/' && path !== '/index.html') {
      return `Excalidraw - ${path.replace(/\//g, '')}`;
    }

    // Use element count and timestamp
    const elementCount = data.elements.filter((e: any) => !e.isDeleted).length;
    const timestamp = new Date().toISOString().split('T')[0];

    if (elementCount > 0) {
      return `Diagram ${timestamp} (${elementCount} elements)`;
    }

    return `Diagram ${timestamp}`;
  } catch (error) {
    contentLogger.error('Error generating diagram name:', error);
    return `Diagram ${new Date().toISOString()}`;
  }
}

/**
 * Handle diagram data received from injected script
 */
async function handleDiagramData(payload: any) {
  try {
    const { diagram, hash: simpleHash, url } = payload;

    contentLogger.info('Received diagram data from injected script');
    contentLogger.info('Elements:', diagram.elements?.length);
    contentLogger.info('Simple hash:', simpleHash);

    // Calculate proper hash
    const properHash = await calculateHash(diagram);
    contentLogger.info('Calculated hash:', properHash);

    // Skip if already synced
    if (properHash === lastSyncedHash) {
      contentLogger.debug('Diagram already synced, skipping');
      return;
    }

    lastSyncedHash = properHash;

    // Generate diagram name
    const name = generateDiagramName(diagram);
    contentLogger.info('Generated name:', name);

    // Send to background for syncing
    // Background will handle ID generation and deduplication
    contentLogger.info(`📤 Sending diagram to background: ${name}`);

    await sendToBackground('DIAGRAM_CHANGED', {
      name,
      data: diagram,
      hash: properHash,
      url: url || window.location.href,
    });

    contentLogger.info('✅ Diagram sent to background successfully');

    // Show success indicator
    showSyncIndicator('✅ Synced');
  } catch (error) {
    contentLogger.error('Error handling diagram data:', error);
    showSyncIndicator('❌ Error', true);
  }
}

/**
 * Handle initialization message from injected script
 */
function handleInit(payload: any) {
  contentLogger.info('Injected script initialized:', payload);
  isInitialized = true;

  if (payload.dataCount > 0) {
    contentLogger.info(`✅ Found ${payload.dataCount} Excalidraw localStorage keys`);
    contentLogger.info('Keys:', payload.keys);
  } else {
    contentLogger.warn('No Excalidraw data found in localStorage');
    contentLogger.info('This might mean:');
    contentLogger.info('1. No diagram is currently loaded');
    contentLogger.info('2. Excalidraw hasn\'t saved anything yet');
    contentLogger.info('3. Try drawing something on the canvas');
  }
}

/**
 * Handle debug message from injected script
 */
function handleDebug(payload: any) {
  contentLogger.info('=== DEBUG INFO FROM INJECTED SCRIPT ===');
  contentLogger.info('All localStorage keys:', payload.allKeys);
  contentLogger.info('Excalidraw data:', payload.excalidrawData);
  contentLogger.info('URL:', payload.url);
  contentLogger.info('=====================================');
}

/**
 * Listen for messages from injected script
 */
function setupMessageListener() {
  window.addEventListener('message', async (event) => {
    // Only accept messages from same origin
    if (event.source !== window) {
      return;
    }

    const message = event.data;

    // Check if it's our message
    if (!message || !message.type || !message.type.startsWith('EXCALIDRAW_')) {
      return;
    }

    contentLogger.debug('Received message from injected script:', message.type);

    try {
      switch (message.type) {
        case 'EXCALIDRAW_DATA':
          await handleDiagramData(message.payload);
          break;

        case 'EXCALIDRAW_INIT':
          handleInit(message.payload);
          break;

        case 'EXCALIDRAW_DEBUG':
          handleDebug(message.payload);
          break;

        default:
          contentLogger.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      contentLogger.error('Error handling message:', error);
    }
  });

  contentLogger.info('✅ Message listener set up');
}

/**
 * Show sync status indicator
 */
function showSyncIndicator(text: string, isError: boolean = false) {
  const existingIndicator = document.getElementById('excalidraw-sync-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  const indicator = document.createElement('div');
  indicator.id = 'excalidraw-sync-indicator';
  indicator.textContent = text;

  const bgColor = isError
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 24px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 600;
    z-index: 999999;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  document.body.appendChild(indicator);

  // Fade in
  setTimeout(() => {
    indicator.style.opacity = '1';
  }, 100);

  // Fade out and remove
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => indicator.remove(), 300);
  }, 3000);
}

/**
 * Add permanent status indicator
 */
function addStatusBadge() {
  const badge = document.createElement('div');
  badge.id = 'excalidraw-sync-badge';
  badge.textContent = '🔄';
  badge.title = 'Excalidraw Sync Active';

  badge.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 18px;
    z-index: 999998;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: transform 0.2s ease;
  `;

  badge.addEventListener('mouseenter', () => {
    badge.style.transform = 'scale(1.1)';
  });

  badge.addEventListener('mouseleave', () => {
    badge.style.transform = 'scale(1)';
  });

  badge.addEventListener('click', () => {
    // Trigger manual sync via injected script
    window.postMessage({ type: 'TRIGGER_SYNC' }, '*');
    showSyncIndicator('🔄 Syncing...');
  });

  document.body.appendChild(badge);
  contentLogger.info('Status badge added');
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
    'chrome.runtime.getURL': typeof chrome?.runtime?.getURL === 'function',
  };

  contentLogger.info('Chrome API availability:', checks);

  const allAvailable = Object.values(checks).every(v => v === true);

  if (!allAvailable) {
    console.error('❌ Chrome extension APIs not fully available!');
    console.error('This usually means:');
    console.error('  1. Extension is not loaded in chrome://extensions/');
    console.error('  2. Extension was disabled or removed');
    console.error('  3. Page needs to be refreshed after loading extension');
    console.error('\n👉 Reload the extension and refresh this page.');
  }

  return allAvailable;
}

/**
 * Expose debug functions
 */
function exposeDebugFunctions() {
  (window as any).excalidrawSyncContent = {
    status: () => {
      return {
        url: window.location.href,
        isExcalidrawPage: isExcalidrawPage(),
        isInitialized,
        lastSyncedHash,
        chromeAPIsAvailable: verifyChromeAPIs()
      };
    },
    triggerDebug: () => {
      window.postMessage({ type: 'TRIGGER_DEBUG' }, '*');
    },
    forceSync: () => {
      window.postMessage({ type: 'TRIGGER_SYNC' }, '*');
    }
  };

  console.log(
    '%c🔄 Excalidraw Sync Content Script (ISOLATED world)',
    'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;'
  );
  console.log('Available commands:');
  console.log('  window.excalidrawSyncContent.status() - Show status');
  console.log('  window.excalidrawSyncContent.triggerDebug() - Show debug info');
  console.log('  window.excalidrawSyncContent.forceSync() - Force sync');
  console.log('\nMAIN world script debug tools:');
  console.log('  window.excalidrawSyncDebug - Available from injected script');
}

/**
 * Initialize content script
 */
async function initialize() {
  contentLogger.info('=== Excalidraw Sync Content Script Initializing ===');
  contentLogger.info('URL:', window.location.href);
  contentLogger.info('Hostname:', window.location.hostname);

  // Verify Chrome APIs
  if (!verifyChromeAPIs()) {
    contentLogger.error('❌ Cannot initialize: Chrome extension APIs unavailable');
    console.error('Please reload the extension and refresh this page');
    return;
  }

  // Check if Excalidraw page
  if (!isExcalidrawPage()) {
    contentLogger.warn('Not an Excalidraw page, skipping initialization');
    return;
  }

  contentLogger.info('✅ Excalidraw page detected');

  // Expose debug functions
  exposeDebugFunctions();

  // Set up message listener to receive data from injected script (MAIN world)
  setupMessageListener();

  // Note: Injected script is automatically loaded by Chrome via manifest.json
  // with "world": "MAIN" configuration

  // Add status badge
  setTimeout(() => {
    addStatusBadge();
  }, 1000);

  // Show initial indicator
  showSyncIndicator('🔄 Sync Active');

  contentLogger.info('✅ Content script initialization complete');
  contentLogger.info('Waiting for injected script (MAIN world) to initialize...');
}

// Wait for page to be ready
if (document.readyState === 'loading') {
  contentLogger.info('Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  contentLogger.info('Document already loaded, initializing immediately');
  // Add small delay to ensure DOM is fully ready
  setTimeout(initialize, 500);
}

contentLogger.info('Content script loaded');
