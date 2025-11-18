# Excalidraw Sync Extension - Debugging Guide

## 🎯 Complete Rewrite - New Architecture

The extension has been **completely rewritten** to fix the localStorage detection issue using a **dual-script architecture**.

## Architecture Overview

### The Problem with the Old Approach

Chrome extensions have **context isolation** - content scripts run in an isolated JavaScript context separate from the webpage. This means:
- ❌ Content scripts **cannot** directly access the page's JavaScript variables
- ❌ Content scripts **cannot** see localStorage changes from the page's perspective
- ❌ Intercepting `localStorage.setItem` in a content script doesn't work for the page's actual localStorage calls

This is why the old implementation showed "no diagrams found" even though Excalidraw clearly had data.

### The New Solution: Dual-Script Architecture

#### 1. **Injected Script** (`src/content/injected.ts`)
- Runs in **MAIN world** (same JavaScript context as Excalidraw)
- Has **full access** to the page's real localStorage
- Intercepts `localStorage.setItem()` at the source
- Extracts and validates Excalidraw diagram data
- Communicates with content script via `window.postMessage()`

#### 2. **Content Script** (`src/content/index.ts`)
- Runs in **ISOLATED world** (Chrome extension context)
- Injects the script into MAIN world
- Receives diagram data from injected script via `postMessage`
- Forwards data to background service worker
- Shows visual indicators

#### 3. **Background Service Worker** (`src/background/index.ts`)
- Receives diagram changes from content script
- Saves to IndexedDB (local storage)
- Syncs to Supabase (cloud storage)
- Manages sync queue and conflict resolution

### Message Flow

```
Excalidraw → localStorage.setItem()
                ↓
Injected Script (MAIN world - intercepts)
                ↓
Extract & Validate Diagram Data
                ↓
window.postMessage({ type: 'EXCALIDRAW_DATA' })
                ↓
Content Script (ISOLATED world - receives)
                ↓
chrome.runtime.sendMessage({ type: 'DIAGRAM_CHANGED' })
                ↓
Background Service Worker
                ↓
IndexedDB (local) + Supabase (cloud)
```

## 🚀 Getting Started

### 1. Build the Extension

```bash
# Install dependencies
npm install

# Build for production
npm run build

# OR run in development mode with hot reload
npm run dev
```

### 2. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist` folder from your project

### 3. Test on Excalidraw

1. Navigate to https://excalidraw.com
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to the **Console** tab

You should see these startup messages:
```
[Excalidraw Sync] Content script loaded
[Excalidraw Sync] === Excalidraw Sync Content Script Initializing ===
[Excalidraw Sync] ✅ Excalidraw page detected
[Excalidraw Sync] Injecting script into page context...
[Excalidraw Sync] ✅ Injected script loaded successfully
[Excalidraw Sync] Injected script loaded in MAIN world
[Excalidraw Sync] Initializing injected script...
```

## 🔍 Debugging Tools

### Visual Indicators

When working correctly, you'll see:

1. **🔄 Sync Active** - Temporary indicator when page loads (fades after 3 seconds)
2. **🔄 Circular Badge** - Permanent badge in bottom-left corner
   - Click to trigger manual sync
   - Hover to see tooltip
3. **✅ Synced** - Success indicator after syncing (fades after 3 seconds)
4. **❌ Error** - Error indicator if sync fails (fades after 3 seconds)

### Debug Commands

Open the browser console on the Excalidraw page (not the extension console) and use these commands:

#### Content Script Commands

```javascript
// Show content script status
window.excalidrawSyncContent.status()
// Returns: { url, isExcalidrawPage, isInjected, isInitialized, lastSyncedHash, chromeAPIsAvailable }

// Trigger debug info from injected script
window.excalidrawSyncContent.triggerDebug()

// Force a manual sync
window.excalidrawSyncContent.forceSync()
```

#### Injected Script Commands

```javascript
// Get all Excalidraw-related localStorage data
window.excalidrawSyncDebug.getAllData()

// Extract the current diagram
const diagram = window.excalidrawSyncDebug.extractDiagram()
console.log(diagram)

// Force check for changes
window.excalidrawSyncDebug.forceCheck()

// Send debug info to content script
window.excalidrawSyncDebug.sendDebug()

// Get the last calculated hash
window.excalidrawSyncDebug.getLastHash()
```

#### Raw localStorage Access

```javascript
// See all localStorage keys
console.log(Object.keys(localStorage))

// Get Excalidraw data directly
console.log(localStorage.getItem('excalidraw'))

// Find all Excalidraw keys
const excalidrawKeys = Object.keys(localStorage).filter(k => k.includes('excalidraw'))
console.log(excalidrawKeys)
```

### Check Background Service Worker

1. Go to `chrome://extensions/`
2. Find "Excalidraw Sync"
3. Click **service worker** link (appears when active)
4. This opens DevTools for the background script

Expected messages:
```
Background service worker starting...
User is authenticated, initializing sync engine
Diagram change received from content script
Diagram saved locally: <diagram name>
Diagram synced to cloud: <diagram name>
```

### Inspect IndexedDB

1. Open DevTools on any page
2. Go to **Application** tab
3. Expand **IndexedDB** in left sidebar
4. Find **ExcalidrawSyncDB**
5. Tables:
   - **diagrams** - All synced diagrams with full data
   - **syncQueue** - Pending sync operations
   - **conflicts** - Detected conflicts awaiting resolution
   - **settings** - Extension settings and device ID

## 🐛 Common Issues & Solutions

### Issue 1: "No diagrams found" in popup

**Causes:**
- No diagram currently loaded on Excalidraw
- Excalidraw hasn't auto-saved yet
- Injected script not loading

**Solutions:**
1. Draw something on the Excalidraw canvas
2. Wait 3-5 seconds for auto-save
3. Check console for injected script messages
4. Run `window.excalidrawSyncDebug.getAllData()` to see localStorage
5. Run `window.excalidrawSyncContent.forceSync()` to trigger manual sync

### Issue 2: Content script not loading

**Causes:**
- Extension not reloaded after code changes
- Wrong URL (must be excalidraw.com or localhost)
- Manifest configuration issue

**Solutions:**
1. Reload extension:
   - Go to `chrome://extensions/`
   - Click ↻ (reload) button on the extension
2. **Hard refresh** the Excalidraw page:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
3. Check URL matches: `https://excalidraw.com/*`
4. Look for error messages in console

### Issue 3: Injected script not loading

**Causes:**
- Script not in web_accessible_resources
- Build didn't create injected.js
- CORS or CSP blocking

**Solutions:**
1. Verify `manifest.json` has:
   ```json
   "web_accessible_resources": [{
     "resources": ["src/content/injected.ts", "src/content/injected.js"],
     "matches": ["https://excalidraw.com/*", "http://localhost:*/*"]
   }]
   ```
2. Rebuild: `npm run build`
3. Check `dist/` folder contains `injected.js`
4. Look for 404 errors in console

### Issue 4: Data not syncing to cloud

**Causes:**
- Not signed in to Supabase
- Network error
- Supabase configuration issue

**Solutions:**
1. Click extension icon, check auth status
2. If "Sign in" shown, go to Options and authenticate
3. Check background worker console for errors:
   - Go to `chrome://extensions/`
   - Click "service worker" link
   - Look for error messages
4. Verify Supabase config in Options page
5. Check network tab for failed requests

### Issue 5: Chrome API errors

**Symptoms:**
```
Cannot read properties of undefined (reading 'sendMessage')
chrome is not defined
```

**Solutions:**
1. Rebuild extension: `npm run build`
2. Reload extension in `chrome://extensions/`
3. **Hard refresh** Excalidraw page
4. Check console for "Chrome API availability" - should all be `true`
5. Make sure you loaded from `dist/` folder, not `src/`

## 🧪 Testing Workflow

### Complete Test Procedure

1. **Build**
   ```bash
   npm run build
   ```

2. **Load extension**
   - `chrome://extensions/` → Load unpacked → Select `dist/`

3. **Open Excalidraw**
   - Go to https://excalidraw.com
   - Open DevTools Console (F12)

4. **Verify initialization**
   - Look for console messages showing successful injection
   - See visual indicators appear

5. **Draw something**
   - Add rectangles, text, arrows
   - Wait 3-5 seconds

6. **Check sync**
   - Look for "✅ Synced" indicator
   - Or run: `window.excalidrawSyncContent.status()`
   - Check `lastSyncedHash` is set

7. **Verify in extension**
   - Click extension icon
   - Should show diagram count > 0
   - Click "Browse Diagrams" to see it

8. **Check backend**
   - Open background worker console
   - Look for "Diagram synced to cloud"
   - Check IndexedDB has the diagram
   - Check Supabase dashboard

### Test Real-time Sync

1. Open Excalidraw in two browser windows
2. Sign in with same account in both
3. Draw in window A
4. Watch window B for automatic updates (may take a few seconds)

### Test Conflict Resolution

1. Disable network on device A
2. Edit diagram on device A
3. Edit same diagram on device B (still connected)
4. Re-enable network on device A
5. Check for conflict notification
6. Verify conflict appears in IndexedDB → conflicts table

## 📁 Files Modified in This Rewrite

### New Files
- **src/content/injected.ts** - NEW script that runs in MAIN world

### Rewritten Files
- **src/content/index.ts** - Complete rewrite using postMessage architecture

### Modified Files
- **src/manifest.json** - Added web_accessible_resources
- **vite.config.ts** - Added injected script to build inputs
- **DEBUGGING.md** - This file, completely rewritten

### Unchanged (Still Working)
- `src/background/index.ts` - No changes needed
- `src/lib/sync/sync-engine.ts` - No changes needed
- All Supabase, storage, and UI code - No changes needed

## 🔬 Technical Details

### localStorage Detection

The injected script looks for these key patterns:
```javascript
// Primary key
'excalidraw'

// State key
'excalidraw-state'

// Any key matching pattern (excluding internal keys)
key.startsWith('excalidraw') &&
  !key.includes('state') &&
  !key.includes('collab') &&
  !key.includes('theme') &&
  !key.includes('library')
```

### Data Format Support

**Format 1: Array** (current Excalidraw format)
```json
[
  { "type": "rectangle", "id": "abc", "x": 100, "y": 100, ... }
]
```
- Stored directly as array in 'excalidraw' key
- App state in separate 'excalidraw-state' key
- Extension wraps it in proper structure

**Format 2: Full Object**
```json
{
  "type": "excalidraw",
  "version": 2,
  "elements": [...],
  "appState": {...},
  "files": {}
}
```
- Complete Excalidraw export format
- Used as-is

### Debouncing

- localStorage changes debounced by 3 seconds
- Prevents excessive syncs during rapid editing
- Hash-based change detection prevents duplicate syncs

### Communication Security

- postMessage only accepts messages from same origin
- Type checking ensures valid message format
- Content script validates data before forwarding

## 🆘 Still Having Issues?

If you've tried everything above:

1. **Collect debug info:**
   ```javascript
   // In Excalidraw page console
   window.excalidrawSyncContent.status()
   window.excalidrawSyncDebug.getAllData()
   window.excalidrawSyncDebug.extractDiagram()
   ```

2. **Check all three contexts:**
   - Excalidraw page console
   - Background worker console (chrome://extensions/)
   - Extension popup (if any errors)

3. **Verify build output:**
   ```bash
   ls dist/
   # Should contain: manifest.json, injected.js, background.js, content.js, etc.
   ```

4. **Try fresh install:**
   - Remove extension
   - Delete `dist/` and `node_modules/`
   - `npm install && npm run build`
   - Load unpacked again

5. **Check Chrome version:**
   - Extension requires Manifest V3
   - Chrome 88+ required
   - Check: `chrome://version/`

## ✅ Success Checklist

When everything is working:

- [ ] Console shows all initialization messages
- [ ] Visual indicators appear
- [ ] `window.excalidrawSyncDebug` is available
- [ ] `window.excalidrawSyncContent` is available
- [ ] Drawing triggers sync within 3-5 seconds
- [ ] Extension popup shows diagram count
- [ ] Background worker logs show successful sync
- [ ] IndexedDB contains diagram data
- [ ] Supabase dashboard shows diagram (if authenticated)

## 📚 Additional Resources

- Chrome Extension Docs: https://developer.chrome.com/docs/extensions/
- CRXJS Vite Plugin: https://crxjs.dev/vite-plugin
- Excalidraw: https://github.com/excalidraw/excalidraw
- Supabase: https://supabase.com/docs
