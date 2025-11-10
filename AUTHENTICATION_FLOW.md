# Authentication Flow & Local Storage

## Current Status: Not Authenticated ✅ Working!

Your extension is working perfectly! The warning you saw is **expected behavior** when not authenticated:

```
[Background] [WARN] Sync engine not initialized, queueing for later
```

This is now updated to be clearer and **diagrams are saved locally** even without authentication.

## How It Works Now

### 1. Before Authentication (Current State)

```
Excalidraw Page
  └─→ Content Script detects changes
      └─→ Sends to Background
          └─→ Background SAVES LOCALLY to IndexedDB ✅
          └─→ Shows 💾 badge (saved, not synced)
          └─→ Logs: "diagram saved locally but not synced to cloud"
```

**What happens**:
- ✅ Diagrams are captured from Excalidraw
- ✅ Diagrams are saved to local IndexedDB (persistent storage)
- ❌ NOT synced to cloud (no authentication)
- 💾 Badge shows "saved locally"

### 2. After Authentication

```
User signs in via Options page
  └─→ Sends AUTH_STATE_CHANGED message
      └─→ Background initializes SyncEngine
          └─→ Syncs ALL locally saved diagrams
          └─→ Sets up periodic sync (every 5 minutes)
          └─→ Shows ✓ badge (synced)
```

**What happens**:
- ✅ All existing local diagrams are synced to Supabase
- ✅ New diagrams are synced immediately
- ✅ Periodic sync runs every 5 minutes
- ✅ Cross-device sync enabled

## Badge Indicators

| Badge | Meaning | Duration |
|-------|---------|----------|
| 💾 | Saved locally (not authenticated) | 2 seconds |
| ✓ | Synced to cloud | 2 seconds |
| ! | Error occurred | Until fixed |

## Console Messages

### When Not Authenticated

```
[Background] Diagram change received from content script
[Background] Diagram saved locally: Diagram 2025-11-10 (5 elements)
[Background] [WARN] User not authenticated - diagram saved locally but not synced to cloud
[Background] [INFO] Sign in via Options page to enable cloud sync
```

### When Authenticated

```
[Background] Diagram change received from content script
[Background] Diagram saved locally: Diagram 2025-11-10 (5 elements)
[Background] Diagram synced to cloud: Diagram 2025-11-10 (5 elements)
```

## How to Enable Cloud Sync

### Step 1: Set up Supabase (if you haven't)

1. Go to https://supabase.com
2. Create a free account
3. Create a new project
4. Get your project credentials:
   - Project URL (looks like: `https://xxx.supabase.co`)
   - Anon public key

### Step 2: Configure Extension

1. Update `.env` file:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Rebuild:
   ```bash
   npm run build
   ```

3. Reload extension in `chrome://extensions/`

### Step 3: Create Account & Sign In

1. Right-click extension icon → Options
2. Create account with email/password
3. Sign in

### Step 4: Verify Sync

1. Draw something in Excalidraw
2. Wait 3 seconds
3. Check badge shows ✓ (not 💾)
4. Check console shows "Diagram synced to cloud"

## Storage Architecture

```
┌─────────────────────────────────────────────────┐
│            Content Script (Excalidraw)          │
│  - Monitors localStorage.setItem()              │
│  - Extracts diagram data                        │
│  - Sends to background                          │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│           Background Service Worker             │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │      IndexedDB (Local Storage)          │   │
│  │  - Always saves diagrams                │   │
│  │  - Works offline                        │   │
│  │  - Persistent across restarts           │   │
│  └─────────────────────────────────────────┘   │
│                     │                            │
│                     ▼                            │
│  ┌─────────────────────────────────────────┐   │
│  │     SyncEngine (if authenticated)       │   │
│  │  - Queues for upload                    │   │
│  │  - Handles conflicts                    │   │
│  │  - Retries on failure                   │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              Supabase Cloud                     │
│  - Cross-device sync                            │
│  - Backup                                       │
│  - Conflict resolution                          │
└─────────────────────────────────────────────────┘
```

## Data Flow States

### State 1: Not Authenticated (Current)
```
localStorage change → Content script → Background → IndexedDB ✅
                                                  → Supabase ❌
```

### State 2: Authenticated
```
localStorage change → Content script → Background → IndexedDB ✅
                                                  → SyncEngine ✅
                                                  → Supabase ✅
```

### State 3: Sign In (Transition)
```
Sign in → AUTH_STATE_CHANGED → Initialize SyncEngine
                             → Sync all local diagrams
                             → Enable periodic sync
```

## Testing Current State (No Auth)

1. **Open Excalidraw**: https://excalidraw.com
2. **Open DevTools**: F12 → Console
3. **Draw something**: Rectangle, text, etc.
4. **Wait 3 seconds** (debounce)
5. **Check console**:
   ```
   🔔 Excalidraw localStorage changed! Key: excalidraw
   [Content] Diagram changed, queuing sync: Diagram...
   [Background] Diagram saved locally: Diagram...
   [Background] [WARN] User not authenticated - diagram saved locally but not synced to cloud
   ```
6. **Check badge**: Should show 💾 for 2 seconds
7. **Open extension popup**: Should show diagram count

## Checking Saved Diagrams (Without Auth)

Open DevTools on extension popup or service worker console:

```javascript
// Check diagrams in IndexedDB
const db = await new Dexie('ExcalidrawSyncDB').open();
const diagrams = await db.table('diagrams').toArray();
console.log('Local diagrams:', diagrams);
```

Or use the popup UI - it shows all locally saved diagrams.

## FAQ

**Q: Do I lose my diagrams if not authenticated?**
A: No! Diagrams are saved to IndexedDB (persistent local storage). They'll sync to cloud when you sign in.

**Q: What happens if I draw on multiple tabs?**
A: Each tab's content script captures changes independently. All are saved locally.

**Q: Can I use the extension offline?**
A: Yes! Diagrams are saved locally. They'll sync when you're back online (if authenticated).

**Q: What if I sign in after drawing several diagrams?**
A: All locally saved diagrams will be synced to cloud automatically when you sign in.

**Q: Do I need Supabase?**
A: Only for cloud sync. Local saving works without it.

## Current Implementation Status

✅ **Working**:
- Content script injection
- localStorage monitoring
- Local storage (IndexedDB)
- Chrome API integration
- Service worker polyfills
- Debug tools

⏳ **Pending**:
- Supabase authentication
- Cloud sync
- Cross-device sync
- Conflict resolution

## Next Steps

1. **Test local storage** (no auth needed):
   - Draw in Excalidraw
   - Verify console shows "saved locally"
   - Check popup shows diagram count

2. **Set up Supabase** (when ready):
   - Create account
   - Configure .env
   - Rebuild extension

3. **Test cloud sync** (after auth):
   - Sign in via Options
   - Verify existing diagrams sync
   - Test new diagrams sync immediately
