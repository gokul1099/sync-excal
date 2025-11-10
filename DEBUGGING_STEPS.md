# Debugging: "Found 0 local diagrams" Issue

## Current Situation
- ✅ Diagrams exist in Excalidraw's localStorage
- ❌ Diagrams NOT in extension's IndexedDB (showing "Found 0 local diagrams")
- ❌ Content script not detecting/saving diagrams

## Step-by-Step Debug Process

### Step 1: Reload Extension (IMPORTANT!)

1. Go to `chrome://extensions/`
2. Find "Excalidraw Sync"
3. Click the **reload button** (circular arrow icon)
4. Extension now has the new code with better logging

### Step 2: Reload Excalidraw Page

1. Go to https://excalidraw.com (or reload if already there)
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. You should now see LOTS of new logs!

### Step 3: Check Content Script Logs

In the Excalidraw page console, you should see:

```
[Content] Content script loaded
[Content] Document already loaded, initializing immediately
[Content] Content script initialize() called
[Content] Current URL: https://excalidraw.com
[Content] ✅ Excalidraw page detected, initializing content script
[Content] localStorage keys: (array of keys)
[Content] Excalidraw keys found: (array)
[Content] ✅ localStorage monitoring started
[Content] Monitoring for keys starting with "excalidraw"
[Content] Initial sync attempt 1/5
```

**QUESTION 1: Do you see these logs?**
- [ ] Yes - Good! Go to Step 4
- [ ] No - Content script not loading (see Troubleshooting A below)

### Step 4: Check If It Found Existing Diagram

Look for these logs:

```
[Content] Initial sync attempt 1/5
[Content] All localStorage keys: X
[Content] Found excalidraw key: excalidraw (or similar)
[Content] Raw data length: XXXX
[Content] Parsed data type: excalidraw
[Content] Elements count: X
[Content] ✅ Valid Excalidraw data extracted
[Content] ✅ Initial diagram found!
[Content] Diagram changed, queuing sync: Diagram 2024-11-02
[Content] Diagram change sent to background
```

**QUESTION 2: Do you see "✅ Initial diagram found!"?**
- [ ] Yes - Great! Go to Step 5
- [ ] No - See what error you see (Troubleshooting B below)

### Step 5: Check Background Received It

1. Go to `chrome://extensions/`
2. Click "Inspect views: service worker"
3. Look for:

```
[Background] Diagram change received from content script
[Background] Diagram synced: Diagram 2024-11-02
```

**QUESTION 3: Do you see "Diagram change received"?**
- [ ] Yes - Excellent! Go to Step 6
- [ ] No - Message not being sent (Troubleshooting C below)

### Step 6: Check IndexedDB

On Excalidraw page:
1. DevTools → **Application** tab
2. Expand **IndexedDB** → **ExcalidrawSyncDB** → **diagrams**
3. Should show at least 1 diagram

**QUESTION 4: Do you see diagrams in IndexedDB?**
- [ ] Yes - Perfect! Sync should work now
- [ ] No - Diagram not being saved (Troubleshooting D below)

### Step 7: Test Sync Now

1. Click extension icon
2. Click "Sync Now"
3. Background console should show:

```
[Background] Manual sync requested
[Background] Starting manual sync...
[Sync] Starting full sync
[Sync] Found 1 local diagrams  <-- Should be 1 or more now!
[Sync] Found 0 cloud diagrams
[Sync] Uploading diagram: ...
```

**QUESTION 5: Does it now say "Found 1 local diagrams" (or more)?**
- [ ] Yes - SUCCESS! Should sync to Supabase now
- [ ] No - Still 0 (check Troubleshooting E below)

---

## Troubleshooting

### A: Content Script Not Loading

**Symptoms:** No logs in Excalidraw console

**Fixes:**
1. Make sure you're on `https://excalidraw.com` (not http, not localhost)
2. Check extension is enabled in `chrome://extensions/`
3. Reload extension, reload page
4. Check for any error messages in console (red text)

### B: Diagram Not Found

**Look for the specific error:**

#### Error: "No Excalidraw data found in localStorage"
```
[Content] Found excalidraw key: none
[Content] No Excalidraw data found in localStorage
```

**Fix:**
- The localStorage key isn't called "excalidraw"
- Run this in console to find it:
  ```javascript
  Object.keys(localStorage).filter(k => k.includes('excal'))
  ```
- Share what you find!

#### Error: "Invalid Excalidraw data format"
```
[Content] Invalid Excalidraw data format
[Content] Data structure: (...)
```

**Fix:**
- Data doesn't match expected format
- Share the "Data structure" log
- Might need to adjust validation

#### Error: Elements count: 0
```
[Content] Elements count: 0
```

**Fix:**
- Diagram exists but has no elements (blank diagram)
- Draw something on Excalidraw
- Wait for logs to show change detected

### C: Message Not Received by Background

**Symptoms:** Content logs show "sent to background" but background shows nothing

**Fixes:**
1. Check for errors in content script console (red text)
2. Reload background worker:
   - Close background DevTools
   - Go to `chrome://extensions/`
   - Click "Inspect views: service worker" again
3. Try sending again (draw something new)

### D: Not Saving to IndexedDB

**Symptoms:** Background shows "Diagram synced" but IndexedDB empty

**Check background logs for errors:**
- Look for red error messages
- Look for "Error saving diagram"
- IndexedDB might be blocked

**Fixes:**
1. Check Site Settings → Cookies and site data → Allow
2. Disable strict browser privacy settings temporarily
3. Try incognito mode

### E: Still Shows 0 Diagrams After All Steps

**Last resort debugging:**

1. In Excalidraw console, manually trigger sync:
   ```javascript
   // Get the data
   const data = JSON.parse(localStorage.getItem('excalidraw'));
   console.log('Manual check:', data);
   ```

2. Check if data is valid:
   ```javascript
   console.log('Type:', data.type);
   console.log('Version:', data.version);
   console.log('Elements:', data.elements.length);
   ```

3. If data looks good, the issue is content script detection
   - Share all console logs
   - I'll help debug further

---

## What to Share

If still not working, share these:

1. **Content Script Console Logs** (from Excalidraw page)
   - Copy ALL logs starting from "[Content] Content script loaded"
   - Include any errors in red

2. **Background Console Logs**
   - Copy relevant logs
   - Include any errors

3. **localStorage inspection:**
   ```javascript
   // Run in Excalidraw console:
   Object.keys(localStorage).filter(k => k.includes('excal'))
   ```

4. **Data validation:**
   ```javascript
   // Run in Excalidraw console:
   const key = Object.keys(localStorage).find(k => k.startsWith('excalidraw') && !k.includes('state'));
   const data = JSON.parse(localStorage.getItem(key));
   console.log({
     type: data.type,
     version: data.version,
     elementsCount: data.elements?.length,
     hasAppState: !!data.appState
   });
   ```

Share the results and I can pinpoint exactly what's wrong!

---

## Expected Success Flow

When working correctly:

1. Load Excalidraw page
2. Content script: "✅ Excalidraw page detected"
3. Content script: "✅ localStorage monitoring started"
4. Content script: "✅ Initial diagram found!" (if diagram exists)
5. Content script: "Diagram change sent to background"
6. Background: "Diagram change received"
7. Background: "Diagram synced"
8. IndexedDB shows 1+ diagrams
9. "Sync Now" shows "Found 1 local diagrams"
10. Diagram uploads to Supabase
11. SUCCESS! ✅

Let's get there! Start with Step 1 and tell me what you see.
