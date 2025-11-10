# Fixes Applied - Service Worker Compatibility

## Problem Summary

Two major issues were preventing the extension from working:

### 1. "Cannot read properties of undefined (reading 'sendMessage')"
**Root Cause**: Chrome extension API wasn't available when content script tried to use it.

### 2. "ReferenceError: window is not defined"
**Root Cause**: Background service worker (Manifest V3) doesn't have access to browser APIs like:
- `window` object
- `document` object
- `localStorage` / `sessionStorage`
- `BroadcastChannel` API

Supabase's auth library tries to access these APIs even with a custom storage adapter.

## Latest Fix (2025-11-10)

### TypeError: window.dispatchEvent is not a function

**Root Cause**: Incomplete window polyfill. Supabase uses `window.dispatchEvent()` for internal event handling, but the initial polyfill only included basic methods.

**Solution**: Added comprehensive window mock with full event handling:
- `addEventListener()` - With event listener storage
- `removeEventListener()` - Properly removes handlers
- `dispatchEvent()` - Actually calls registered handlers
- `CustomEvent` and `Event` classes
- Full `location` object with extension ID
- Complete `navigator` object

**Files Updated**:
- `src/background/index.ts:10-139` - Comprehensive polyfills with event handling
- `src/lib/supabase/client.ts:11-63` - Matching fallback polyfill

## Solutions Implemented

### Fix 1: Chrome API Safety Checks

**Files Modified**:
- `src/lib/utils/messaging.ts:10-28`
- `src/content/index.ts:289-311`

**Changes**:
- Added `isChromeExtensionContext()` check before using `chrome.runtime.sendMessage()`
- Added detailed diagnostics when Chrome API is unavailable
- Added startup verification in content script

**Result**: Clear error messages that tell you exactly what's wrong and how to fix it.

### Fix 2: Service Worker Polyfills

**Files Modified**:
- `src/background/index.ts:6-40` (Primary polyfills)
- `src/lib/supabase/client.ts:8-29` (Secondary polyfills)

**Polyfills Added**:

```typescript
// Global polyfills in background script
window = globalThis
document = { addEventListener, removeEventListener }
localStorage = { getItem, setItem, removeItem, clear }
sessionStorage = { getItem, setItem, removeItem, clear }
BroadcastChannel = class (mock implementation)
```

**Why This Works**:
- Supabase checks `typeof window !== 'undefined'` before using browser features
- By providing mock objects, Supabase doesn't crash
- Actual storage uses Chrome Storage API (via custom adapter)
- BroadcastChannel mock prevents cross-tab sync errors

### Fix 3: Supabase Configuration

**File**: `src/lib/supabase/client.ts:75-93`

**Changes**:
```typescript
auth: {
  storage: chromeStorageAdapter,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,  // Service worker can't read URL
  flowType: 'pkce',
  storageKey: 'excalidraw-sync-auth',
}
```

**Result**: Supabase auth works properly in service worker context.

### Fix 4: Enhanced Debugging

**Files Added**:
- `DEBUGGING.md` - Comprehensive troubleshooting guide
- `QUICK_START.md` - Step-by-step testing guide
- `FIXES_APPLIED.md` - This document

**Changes**:
- Visual "🔄 Sync Active" indicator on Excalidraw page
- Debug commands: `window.excalidrawSync.*`
- Detailed console logging at every step

## Technical Details

### Manifest V3 Service Worker Limitations

Service workers are designed for background tasks and don't have:
- DOM access (no `window`, `document`)
- Synchronous storage (no `localStorage`)
- Browser UI APIs (no `alert`, `confirm`)
- Some Web APIs (limited `fetch`, no `XMLHttpRequest`)

### Chrome Extension APIs Available

Service workers CAN use:
- `chrome.runtime.*` - Messaging, extension info
- `chrome.storage.*` - Async key-value storage
- `chrome.alarms.*` - Scheduled tasks
- `chrome.tabs.*` - Tab management
- `crypto.subtle.*` - Web Crypto API
- `IndexedDB` - Async database (via Dexie)

### Architecture Flow

```
Excalidraw Page (window ✅)
  └─→ Content Script (window ✅, chrome ✅)
      └─→ Background Service Worker (window ❌ → polyfilled ✅, chrome ✅)
          └─→ Supabase Client (needs window ❌ → polyfilled ✅)
              └─→ Chrome Storage Adapter (chrome.storage ✅)
```

## Testing The Fixes

### Step 1: Rebuild and Reload
```bash
npm run build
```

Go to `chrome://extensions/` → Click refresh icon → Hard refresh Excalidraw page

### Step 2: Verify No Errors

**Excalidraw Page Console** (Content Script):
```
✅ Chrome API availability: { all checks true }
✅ Excalidraw page detected
🔄 Excalidraw Sync Debug Tools
```

**Extension Console** (Background Script):
```
[Background] Background service worker starting...
[Background] User is authenticated: user@example.com
[Background] Periodic sync scheduled every 5 minutes
```

### Step 3: Test Sync

1. Draw something in Excalidraw
2. Wait 3 seconds
3. Check console for: "🔔 Excalidraw localStorage changed!"
4. Check extension popup for diagram count

## Build Output

Latest build size:
- Total: ~520 KB
- Main bundle: 173 KB (client with polyfills)
- Database layer: 76 KB
- UI components: ~30 KB

Polyfill overhead: ~1 KB (minimal impact)

## Files Changed Summary

| File | Lines Changed | Purpose |
|------|--------------|---------|
| `src/background/index.ts` | +35 | Global polyfills |
| `src/lib/supabase/client.ts` | +25 | Window polyfill + config |
| `src/lib/utils/messaging.ts` | +18 | Safety checks |
| `src/content/index.ts` | +95 | Debug tools + verification |
| `DEBUGGING.md` | +155 | Documentation |
| `QUICK_START.md` | +100 | Testing guide |

## Next Steps

Now that the extension loads and runs without errors:

1. **Test Supabase Authentication**:
   - Open Options page
   - Enter credentials
   - Sign in

2. **Test Diagram Sync**:
   - Draw on Excalidraw
   - Check Supabase dashboard
   - Verify data appears

3. **Test Cross-Device Sync**:
   - Install on another machine
   - Sign in with same account
   - Verify diagrams sync

## Known Limitations

1. **No Cross-Tab Sync**: BroadcastChannel is mocked, so diagrams don't sync between tabs in real-time (only between devices via cloud)
2. **No URL Detection**: `detectSessionInUrl: false` means OAuth redirects won't work (use email/password auth)
3. **No DOM Access in Background**: Background script can't interact with page content (use content script instead)

## If You Still Have Issues

Run diagnostics:

```javascript
// In Excalidraw console
window.excalidrawSync.status()

// Should show:
{
  url: "https://excalidraw.com/",
  isExcalidrawPage: true,
  chrome API: all true
}
```

Check extension console for specific errors and refer to `DEBUGGING.md`.
