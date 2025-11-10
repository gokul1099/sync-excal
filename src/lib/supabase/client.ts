/**
 * Supabase client with Chrome storage adapter
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Polyfill for service worker environment (no window object)
// Supabase internally checks for window, so we provide a comprehensive mock
// Note: Main polyfills are in background/index.ts, this is a fallback
if (typeof window === 'undefined') {
  const eventListeners = new Map<string, Set<Function>>();

  (globalThis as any).window = {
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
      href: 'chrome-extension://' + (chrome?.runtime?.id || ''),
      origin: 'chrome-extension://' + (chrome?.runtime?.id || ''),
      protocol: 'chrome-extension:',
      host: chrome?.runtime?.id || '',
      hostname: chrome?.runtime?.id || '',
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
    CustomEvent: class CustomEvent {
      constructor(public type: string, public detail?: any) {}
    },
    Event: class Event {
      constructor(public type: string, public options?: any) {}
    },
  };
}

// Chrome storage adapter for Supabase auth
const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('Error reading from chrome.storage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('Error writing to chrome.storage:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('Error removing from chrome.storage:', error);
    }
  },
};

let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Get or create Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: 'public',
    },
    auth: {
      storage: chromeStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // Disable browser-specific features for service worker
      flowType: 'pkce',
      storageKey: 'excalidraw-sync-auth',
    },
    global: {
      headers: {
        'X-Client-Info': 'excalidraw-sync-extension',
      },
    },
  });

  return supabaseClient;
}

/**
 * Initialize Supabase client (call once on extension load)
 */
export async function initializeSupabase(): Promise<void> {
  const client = getSupabaseClient();

  // Check if user is already authenticated
  const {
    data: { session },
  } = await client.auth.getSession();

  if (session) {
    console.log('User is authenticated:', session.user.email);
  } else {
    console.log('No active session');
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const client = getSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  return !!session;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
  const client = getSupabaseClient();
  return await client.auth.signUp({ email, password });
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const client = getSupabaseClient();
  return await client.auth.signInWithPassword({ email, password });
}

/**
 * Sign out
 */
export async function signOut() {
  const client = getSupabaseClient();
  return await client.auth.signOut();
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const client = getSupabaseClient();
  return client.auth.onAuthStateChange(callback);
}
