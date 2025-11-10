/**
 * Message passing utilities for Chrome extension communication
 */

import type { Message, MessageType } from '@/types/messages';

/**
 * Check if Chrome extension API is available
 */
function isChromeExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && chrome?.runtime?.id !== undefined;
}

/**
 * Send a message to the background service worker
 */
export async function sendToBackground<T = any>(
  type: MessageType,
  payload?: any
): Promise<T | undefined> {
  // Safety check: ensure we're in a Chrome extension context
  if (!isChromeExtensionContext()) {
    console.error('Chrome extension API not available. Extension may not be loaded properly.');
    console.error('chrome:', typeof chrome);
    console.error('chrome.runtime:', typeof chrome?.runtime);
    console.error('chrome.runtime.id:', chrome?.runtime?.id);
    throw new Error('Chrome extension API not available');
  }

  const message: Message = {
    type,
    payload,
    timestamp: Date.now(),
  };

  try {
    const response = await chrome.runtime.sendMessage(message);
    return response;
  } catch (error) {
    console.error('Error sending message to background:', error);
    console.error('Message type:', type);
    console.error('Extension ID:', chrome?.runtime?.id);
    throw error;
  }
}

/**
 * Send a message to a specific tab
 */
export async function sendToTab<T = any>(
  tabId: number,
  type: MessageType,
  payload?: any
): Promise<T | undefined> {
  const message: Message = {
    type,
    payload,
    timestamp: Date.now(),
  };

  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    console.error(`Error sending message to tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Send a message to all tabs
 */
export async function sendToAllTabs(type: MessageType, payload?: any): Promise<void> {
  const message: Message = {
    type,
    payload,
    timestamp: Date.now(),
  };

  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs.map(async (tab) => {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, message);
          } catch (error) {
            // Tab might not have content script, ignore
          }
        }
      })
    );
  } catch (error) {
    console.error('Error sending message to all tabs:', error);
  }
}

/**
 * Listen for messages from any source
 */
export function onMessage<T = any>(
  callback: (message: Message<T>, sender: chrome.runtime.MessageSender) => void | Promise<any>
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = callback(message, sender);

    // If callback returns a promise, handle it
    if (result instanceof Promise) {
      result.then(sendResponse).catch((error) => {
        console.error('Error in message handler:', error);
        sendResponse({ error: error.message });
      });
      return true; // Keep the message channel open for async response
    }

    return false;
  });
}

/**
 * Listen for messages of a specific type
 */
export function onMessageType<T = any>(
  type: MessageType,
  callback: (payload: T, sender: chrome.runtime.MessageSender) => void | Promise<any>
): void {
  onMessage((message, sender) => {
    if (message.type === type) {
      return callback(message.payload, sender);
    }
  });
}
