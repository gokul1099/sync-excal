# Debugging Guide - Excalidraw Sync Not Working

## Step 1: Check Browser Console Logs

### Open Developer Tools
1. **For Background Worker:**
   - Go to `chrome://extensions/`
   - Find "Excalidraw Sync"
   - Click "Inspect views: service worker"
   - Check Console tab for logs

2. **For Content Script (Excalidraw page):**
   - Go to https://excalidraw.com
   - Press F12 to open DevTools
   - Check Console tab for logs

3. **For Popup:**
   - Right-click extension icon → "Inspect popup"
   - Check Console tab

## Step 2: Verify Authentication

### Check if you're logged in:
1. Click extension icon
2. Should show your email, not "Sign In" button
3. In background console, look for: `User is authenticated: your@email.com`

### If not authenticated:
1. Click extension icon → "Sign In"
2. Create account or sign in
3. Check background console for auth logs

## Step 3: Check Excalidraw Detection

### On excalidraw.com page console, look for:
- ✅ `[Content] Excalidraw page detected, initializing content script`
- ✅ `[Content] localStorage monitoring started`
- ✅ `[Content] Initial diagram found` (if diagram exists)

### If you DON'T see these:
- Content script isn't loading
- Check `chrome://extensions/` - extension should be enabled
- Reload the Excalidraw page

## Step 4: Test Diagram Detection

### Create a test diagram:
1. Go to https://excalidraw.com
2. Draw something (rectangle, circle, anything)
3. Wait 5 seconds
4. Check content script console for:
   - `[Content] Diagram changed, queuing sync: Diagram YYYY-MM-DD`
   - `[Content] Diagram change sent to background`

### If nothing appears:
- localStorage might not be changing
- Check if you actually drew something
- Try drawing more elements

## Step 5: Check Background Processing

### In background worker console after drawing:
1. Should see: `[Background] Diagram change received from content script`
2. Should see: `[Background] Diagram synced: [name]`
3. Should see: `[Sync] Uploading diagram: [name]`
4. Should see: `[Sync] Successfully uploaded diagram: [name]`

### If stuck after "Diagram change received":
- Check for errors in red
- Might be Supabase connection issue
- Check `.env` credentials are correct

## Step 6: Manual Sync Test

### Click "Sync Now" button in popup:

**Expected logs in background console:**
```
[Background] Manual sync requested
[Background] Starting manual sync...
[Sync] Starting full sync
[Sync] Found X local diagrams
[Sync] Found Y cloud diagrams
[Background] Manual sync completed successfully
```

### If you see "Found 0 local diagrams":
**This is the issue!** No diagrams in IndexedDB to sync.

**Reasons:**
1. Content script never detected a diagram
2. Content script couldn't save to IndexedDB
3. You haven't drawn anything on Excalidraw yet

## Step 7: Force a Diagram Creation

### Manual test to create a diagram:

1. Go to https://excalidraw.com
2. Open browser console (F12)
3. Draw something
4. Run this in console to check localStorage:
   ```javascript
   Object.keys(localStorage).filter(k => k.includes('excalidraw'))
   ```
5. Should show keys like `excalidraw` or `excalidraw-state`

6. Check the data:
   ```javascript
   const data = localStorage.getItem('excalidraw');
   console.log(JSON.parse(data));
   ```

7. Should show Excalidraw JSON with elements array

## Step 8: Check Supabase Connection

### Verify Supabase credentials:

1. Check `.env` file exists:
   ```bash
   cat .env
   ```

2. Should have:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```

3. Rebuild after adding .env:
   ```bash
   npm run build
   ```

4. Reload extension in Chrome

### Test Supabase connection:

In background console, run:
```javascript
// This won't work directly, but check for auth errors
```

Look for errors like:
- ❌ "Missing Supabase environment variables"
- ❌ "Failed to upload diagram: ..."
- ❌ Network errors

## Step 9: Check Supabase Dashboard

1. Go to https://app.supabase.com
2. Open your project
3. Go to **Table Editor**
4. Check `diagrams` table
5. Should see your diagrams if sync worked

If empty:
- Sync hasn't worked yet
- Check all steps above

## Step 10: Check IndexedDB

### See what's in local storage:

1. On Excalidraw page, open DevTools
2. Go to **Application** tab
3. Expand **IndexedDB** → **ExcalidrawSyncDB**
4. Check **diagrams** store
5. Should see any diagrams you've created

If empty:
- Content script hasn't saved anything yet
- Draw something and wait 3 seconds

## Common Issues & Solutions

### Issue: "No diagrams syncing"
**Solution:**
1. Make sure you're on https://excalidraw.com (not http)
2. Draw something
3. Wait 3-5 seconds
4. Check content script console for logs

### Issue: "Sync engine not initialized"
**Solution:**
1. Not authenticated - sign in first
2. Check background console for initialization errors
3. Reload extension

### Issue: "Missing Supabase environment variables"
**Solution:**
1. Create `.env` file in project root
2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
3. Rebuild: `npm run build`
4. Reload extension

### Issue: "Content script not loading"
**Solution:**
1. Check extension is enabled in `chrome://extensions/`
2. Check content script matches in manifest.json
3. Reload Excalidraw page
4. Check for CSP errors in console

### Issue: "Database errors"
**Solution:**
1. Run migrations: `supabase db push`
2. Check tables exist in Supabase dashboard
3. Enable realtime for diagrams table

## Quick Test Checklist

Run through this checklist:

- [ ] Extension loaded and enabled
- [ ] Signed in (email shown in popup)
- [ ] On https://excalidraw.com
- [ ] Drew something
- [ ] Waited 3+ seconds
- [ ] Checked background console for logs
- [ ] Checked content console for logs
- [ ] Clicked "Sync Now"
- [ ] Saw sync logs in background
- [ ] Checked Supabase dashboard for data
- [ ] Checked IndexedDB for local data

## Still Not Working?

### Collect debug info:

1. **Background console logs** (copy all)
2. **Content script console logs** (copy all)
3. **Extension manifest** (check version)
4. **.env file** (verify it exists, don't share keys!)
5. **Supabase dashboard** (screenshot of tables)

### Things to try:

1. **Full rebuild:**
   ```bash
   rm -rf dist node_modules
   npm install
   npm run build
   ```

2. **Reload extension:**
   - Go to `chrome://extensions/`
   - Click reload button
   - Reload Excalidraw page

3. **Clear extension data:**
   - Right-click extension icon → Remove
   - Re-add extension
   - Sign in again
   - Test again

4. **Check browser:**
   - Try different Chrome profile
   - Try incognito mode
   - Try different browser (Edge, Brave)

## Expected Behavior (When Working)

1. **On Excalidraw page:**
   - Content script logs detection
   - Monitors localStorage
   - Detects diagram changes
   - Sends to background

2. **In background:**
   - Receives diagram data
   - Saves to IndexedDB
   - Queues for upload
   - Uploads to Supabase
   - Shows badge: ✓

3. **In Supabase:**
   - New row in diagrams table
   - Contains full diagram JSON
   - Shows your user_id

4. **On other device:**
   - Extension polls cloud
   - Detects new diagram
   - Downloads it
   - Shows in side panel
   - Real-time updates work

---

**Need more help?** Share the console logs and I can help debug further!
