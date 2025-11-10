# Debugging Excalidraw Sync Extension

## Understanding Chrome Extension Context Isolation

Your extension has **3 separate JavaScript contexts**:

1. **Background Service Worker** - Isolated, has chrome.* APIs, own storage
2. **Extension Popup/Options** - Isolated, has chrome.* APIs, own storage
3. **Content Script** - Runs IN the webpage, shares page's DOM and localStorage ✅

## Why You Can't See localStorage in Extension Console

When you open DevTools for your extension popup (chrome-extension://...), you're looking at the **extension's isolated storage**, NOT the Excalidraw page's storage.

## How to Debug Content Script ✅

### Method 1: Visual Indicator (New!)

1. Load your extension in Chrome
2. Go to https://excalidraw.com
3. You should see a "🔄 Sync Active" badge appear for 3 seconds
4. This confirms the content script is injected and running

### Method 2: Console Debug Tools (New!)

1. Open https://excalidraw.com
2. Open DevTools (F12 or right-click → Inspect)
3. Look for the styled message: **"🔄 Excalidraw Sync Debug Tools"**
4. Use these commands in the console:

```javascript
// View all localStorage data
window.excalidrawSync.getLocalStorage()

// Extract current diagram data
window.excalidrawSync.getData()

// Force sync to Supabase now
window.excalidrawSync.forceSync()

// Check content script status
window.excalidrawSync.status()
```

### Method 3: View Console Logs

In the Excalidraw page console (not extension console), you'll see:
- ✅ "Excalidraw page detected, initializing content script"
- "localStorage keys: [...]"
- "Excalidraw keys found: [...]"
- 🔔 "Excalidraw localStorage changed! Key: excalidraw"

### Method 4: Inspect Content Script Directly

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Find "Excalidraw Sync" extension
4. Click **"Inspect views: service worker"** (for background script)
5. OR right-click on Excalidraw page → Inspect → Console tab (for content script)

## Testing Your Implementation

### Step 1: Build and Load Extension

```bash
npm install
npm run build
```

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **"Load unpacked"**
4. Select the `dist/` folder

### Step 2: Test on Excalidraw

1. Open https://excalidraw.com
2. Draw something
3. Check console for debug messages
4. Run `window.excalidrawSync.status()` to verify

### Step 3: Verify Sync

1. Open extension popup
2. Check if diagram count increases
3. Check Supabase dashboard for new entries

## Architecture Overview

```
Excalidraw Page
    └─→ localStorage.setItem() intercepted
        └─→ Content Script (src/content/index.ts)
            └─→ chrome.runtime.sendMessage('DIAGRAM_CHANGED')
                └─→ Background Service Worker (src/background/index.ts)
                    └─→ SyncEngine.queueSync()
                        └─→ Supabase Cloud
```

## Common Issues

### Issue: "Error sending message to background: TypeError: Cannot read properties of undefined (reading 'sendMessage')"

**Cause**: Chrome extension API is not available. This means `chrome` object is undefined.

**Solutions**:

1. **Rebuild and reload the extension**:
   ```bash
   npm run build
   ```
   - Go to `chrome://extensions/`
   - Click the **refresh icon** on your extension card
   - **Refresh the Excalidraw page** (Ctrl+R or Cmd+R)

2. **Verify extension is loaded**:
   - Open `chrome://extensions/`
   - Find "Excalidraw Sync"
   - Ensure it's **Enabled** (toggle on)
   - Check for any errors in red

3. **Check the console output**:
   - Open Excalidraw page
   - Open DevTools (F12)
   - Look for "Chrome API availability" message
   - Should show all checks as `true`

4. **Hard refresh**:
   - After reloading extension, do a **hard refresh** on Excalidraw page
   - Chrome: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

5. **Check manifest.json in dist/**:
   - After build, verify `dist/manifest.json` exists
   - Verify content_scripts section is present

### Issue: "No diagram data found"
- Wait a few seconds for Excalidraw to fully load
- Try drawing/modifying something
- Check `window.excalidrawSync.getLocalStorage()`

### Issue: Content script not loading
- Check manifest.json has correct URL patterns
- Verify `run_at: "document_end"` in manifest
- Reload extension after code changes
- **Hard refresh** the page after reloading extension

### Issue: Can't access localStorage in popup
- This is expected! Popup has its own isolated storage
- Use content script debug tools instead

### Issue: Extension loads but content script doesn't run
- Check the URL matches patterns in manifest: `https://excalidraw.com/*`
- Content script only runs on matching URLs
- Try both `https://excalidraw.com` and `https://excalidraw.com/`

### Issue: "ReferenceError: window is not defined" in background service worker

**Cause**: Background service workers run in a different context without browser APIs like `window`, `document`, `localStorage`, or `BroadcastChannel`. Supabase tries to access these.

**Solution**: This is now fixed with polyfills in:
- `src/background/index.ts:6-40` - Global polyfills for service worker
- `src/lib/supabase/client.ts:8-29` - Additional window polyfill

If you still see this error:
1. Make sure you rebuilt: `npm run build`
2. Reload the extension in `chrome://extensions/`
3. Check that polyfills are loading (should be first in background script)

## Files Reference

- `src/manifest.json:25-30` - Content script configuration
- `src/content/index.ts:167` - localStorage monitoring
- `src/content/index.ts:238` - Debug functions
- `src/background/index.ts:88` - Message handler

## Useful Chrome URLs

- `chrome://extensions/` - Extension management
- `chrome://inspect/#service-workers` - Inspect service workers
- `chrome://serviceworker-internals/` - Service worker internals
