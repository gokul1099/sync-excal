# Quick Start Guide - Testing Your Extension

## Step 1: Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Navigate to: `/Users/gokul99/My Work/sync-excal/dist/`
5. Select the `dist` folder and click "Select"
6. You should see "Excalidraw Sync" extension loaded

## Step 2: Test on Excalidraw

1. Open a new tab and go to: https://excalidraw.com
2. Open DevTools (F12 or Right-click → Inspect)
3. Go to the **Console** tab

## Step 3: Verify Content Script is Working

You should see these messages in the console:

```
✅ Chrome API availability: {
  chrome: true,
  chrome.runtime: true,
  chrome.runtime.id: true,
  chrome.runtime.sendMessage: true
}

✅ Excalidraw page detected, initializing content script

🔄 Excalidraw Sync Debug Tools
Available commands:
  window.excalidrawSync.getLocalStorage() - View localStorage data
  window.excalidrawSync.getData() - Extract current diagram
  window.excalidrawSync.forceSync() - Force sync now
  window.excalidrawSync.status() - Show status
```

## Step 4: Test Debug Commands

In the console, run:

```javascript
// Check if content script can see localStorage
window.excalidrawSync.status()

// View localStorage keys
window.excalidrawSync.getLocalStorage()
```

Expected output:
```javascript
Content script status: {
  url: "https://excalidraw.com/",
  isExcalidrawPage: true,
  lastHash: null,
  localStorageKeys: ["excalidraw", "excalidraw-state", ...]
}
```

## Step 5: Draw and Test Sync

1. Draw something in Excalidraw (rectangle, text, etc.)
2. Wait 3 seconds (debounce delay)
3. Watch console for sync messages:
   ```
   🔔 Excalidraw localStorage changed! Key: excalidraw
   Diagram changed, queuing sync: Diagram 2025-11-10 (X elements)
   ```

## Step 6: Verify in Extension Popup

1. Click the extension icon in Chrome toolbar
2. You should see:
   - Diagram count
   - Last sync time
   - Sync status

## Troubleshooting

### If you see: "Chrome extension API not available"

This means the extension isn't loaded properly. Fix:

1. Go to `chrome://extensions/`
2. Find "Excalidraw Sync"
3. Click the **refresh/reload icon** (🔄)
4. Go back to Excalidraw tab
5. **Hard refresh**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

### If content script doesn't run

1. Check URL is exactly: `https://excalidraw.com/` (or with path)
2. Refresh the page
3. Check console for error messages
4. Verify extension is enabled in `chrome://extensions/`

### If you still get errors

Run this in console to diagnose:

```javascript
console.log('chrome:', typeof chrome);
console.log('chrome.runtime:', typeof chrome?.runtime);
console.log('chrome.runtime.id:', chrome?.runtime?.id);
```

All should show valid values (not undefined).

## What Changed

I added:

1. **Chrome API verification** - Checks if `chrome` object is available before using it
2. **Detailed error messages** - Tells you exactly what's wrong
3. **Visual indicator** - "🔄 Sync Active" badge confirms content script loaded
4. **Debug commands** - Easy testing via `window.excalidrawSync.*`

## Next Steps

Once everything works:

1. Configure Supabase credentials in Options page
2. Test full sync flow
3. Check Supabase dashboard for synced diagrams

## Need Help?

Check `DEBUGGING.md` for detailed troubleshooting.
