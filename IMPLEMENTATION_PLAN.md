# Excalidraw Cloud Sync - Chrome Extension Implementation Plan

## Executive Summary

A Chrome extension that automatically syncs Excalidraw diagrams to cloud storage (Google Drive, Dropbox, OneDrive) enabling seamless multi-device synchronization. The extension will detect Excalidraw usage, monitor changes, and sync diagrams bidirectionally with intelligent conflict resolution.

---

## 1. Technical Analysis

### 1.1 Excalidraw Data Structure

Excalidraw stores diagrams in JSON format with the following structure:

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "id": "unique-id",
      "type": "rectangle|arrow|text|...",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      // ... other properties
    }
  ],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff",
    // ... other canvas settings
  },
  "files": {
    "file-id": {
      "mimeType": "image/png",
      "id": "file-id",
      "dataURL": "data:image/png;base64,...",
      "created": 1234567890,
      "lastRetrieved": 1234567890
    }
  }
}
```

**Key Insights:**
- Data stored in browser's localStorage
- Each diagram has unique elements array
- Files (images) are base64 encoded and can be large
- AppState contains canvas configuration

### 1.2 Chrome Extension Capabilities (Manifest V3)

**Content Scripts:**
- CAN access webpage's localStorage
- CAN inject into Excalidraw pages
- CAN monitor DOM changes
- CAN communicate with background service worker

**Background Service Worker:**
- CANNOT access localStorage (service worker limitation)
- CAN use chrome.storage API
- CAN make cloud API calls
- CAN handle periodic sync

**Storage Options:**
- chrome.storage.local - unlimited (with permission)
- chrome.storage.sync - 100KB limit (NOT suitable for diagrams)
- IndexedDB - unlimited (with permission)

### 1.3 Cloud Storage APIs

**Google Drive API v3:**
- OAuth2 via chrome.identity.getAuthToken()
- REST API for file operations
- Supports file metadata and versioning
- 15GB free storage
- Good query capabilities

**Dropbox API:**
- OAuth2 via chrome.identity.launchWebAuthFlow()
- Simple file sync API
- 2GB free storage
- Change detection via cursors

**OneDrive API:**
- Microsoft Graph API
- OAuth2 authentication
- 5GB free storage
- Delta sync support

---

## 2. System Architecture

### 2.1 Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    EXCALIDRAW WEB PAGE                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Content Script (Injected)                   │  │
│  │  • Monitor localStorage changes                       │  │
│  │  • Detect diagram modifications                       │  │
│  │  • Extract diagram data                               │  │
│  │  • Apply incoming synced changes                      │  │
│  └─────────────────┬─────────────────────────────────────┘  │
└────────────────────┼─────────────────────────────────────────┘
                     │ Message Passing
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          Background Service Worker                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Sync Engine                                        │    │
│  │  • Queue management                                 │    │
│  │  • Conflict detection                               │    │
│  │  • Hash-based change detection                      │    │
│  │  • Bidirectional sync orchestration                 │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Cloud Storage Manager                              │    │
│  │  • OAuth2 token management                          │    │
│  │  • Upload/download operations                       │    │
│  │  • Multi-provider abstraction                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────┘
                      │ Cloud API Calls
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Storage                            │
│  [Google Drive] [Dropbox] [OneDrive]                        │
│  • Diagram files (.excalidraw.json)                         │
│  • Metadata (timestamps, hashes)                            │
│  • Version history                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Extension UI Components                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Popup      │  │   Options    │  │  Side Panel  │      │
│  │   • Status   │  │   • Settings │  │  • Browse    │      │
│  │   • Sync Now │  │   • Auth     │  │  • Search    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### Upload Flow (Local → Cloud)
1. User edits diagram on Excalidraw
2. Content script detects localStorage change
3. Debounce for 3 seconds (avoid excessive saves)
4. Send diagram data to background worker
5. Background worker:
   - Calculate hash of diagram data
   - Check if hash changed (skip if same)
   - Add to upload queue
   - Authenticate with cloud provider
   - Upload diagram with metadata
   - Update local metadata cache
6. Notify user of sync status

#### Download Flow (Cloud → Local)
1. Background worker polls cloud every 5 minutes
2. Fetch list of diagrams with timestamps
3. Compare with local metadata
4. Detect newer versions on cloud
5. Download changed diagrams
6. For active Excalidraw tabs:
   - Check if diagram is currently open
   - If open and modified locally → Conflict!
   - If open and not modified → Auto-update
   - If not open → Update cache
7. Notify content script to refresh if needed

### 2.3 Storage Strategy

**Local Storage (IndexedDB):**
```javascript
{
  diagrams: {
    [diagramId]: {
      id: "uuid",
      name: "My Diagram",
      hash: "sha256-hash",
      localTimestamp: 1234567890,
      cloudTimestamp: 1234567890,
      cloudProvider: "gdrive",
      cloudFileId: "cloud-specific-id",
      cloudPath: "/Excalidraw/diagram.excalidraw.json",
      conflictStatus: null | "conflict",
      lastSynced: 1234567890,
      isSyncing: false
    }
  },
  settings: {
    cloudProvider: "gdrive|dropbox|onedrive",
    autoSync: true,
    syncInterval: 300000, // 5 minutes
    conflictResolution: "manual|latest|local|cloud",
    folderPath: "/Excalidraw"
  },
  auth: {
    // OAuth tokens stored securely
    accessToken: "encrypted",
    refreshToken: "encrypted",
    expiresAt: 1234567890
  },
  syncQueue: [
    {
      diagramId: "uuid",
      operation: "upload|download",
      retryCount: 0,
      addedAt: 1234567890
    }
  ]
}
```

**Cloud Storage:**
```
/Excalidraw/
  ├── diagram-1.excalidraw.json
  ├── diagram-2.excalidraw.json
  └── .metadata/
      ├── diagram-1.meta.json  (timestamps, device info)
      └── diagram-2.meta.json
```

---

## 3. Core Features Specification

### 3.1 Auto-Sync
- Detect when user is on excalidraw.com or self-hosted Excalidraw
- Monitor localStorage for changes
- Debounce saves (3 seconds of inactivity)
- Upload to cloud automatically
- Show sync status badge on extension icon

### 3.2 Multi-Device Sync
- Background sync every 5 minutes (configurable)
- Detect changes from other devices
- Download and apply changes
- Notify user of updates

### 3.3 Conflict Resolution
**Conflict Detection:**
- Occurs when same diagram modified on multiple devices
- Detected by comparing timestamps and hashes

**Resolution Strategies:**
1. **Manual** (Default):
   - Show both versions to user
   - Let user choose which to keep
   - Option to merge manually

2. **Latest Wins**:
   - Automatically keep most recent version
   - Discard older changes

3. **Local Wins**:
   - Always keep local version
   - Overwrite cloud version

4. **Cloud Wins**:
   - Always accept cloud version
   - Discard local changes

### 3.4 Diagram Management
- Browse all synced diagrams
- Search by name
- Preview thumbnails (generated from elements)
- Delete diagrams (local + cloud)
- Rename diagrams
- Export/Import .excalidraw files

### 3.5 Offline Support
- Queue sync operations when offline
- Process queue when connection restored
- Show offline indicator
- Cache diagrams locally for offline access

### 3.6 Security
- OAuth2 authentication (no password storage)
- Tokens encrypted in chrome.storage
- Optional end-to-end encryption for diagram data
- Secure communication (HTTPS only)
- No tracking or analytics

---

## 4. Technology Stack

### 4.1 Extension Core
- **Manifest Version**: V3
- **Language**: TypeScript
- **Build Tool**: Vite + CRXJS
- **Bundler**: Rollup

### 4.2 UI Framework
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: Zustand

### 4.3 Storage
- **Local**: IndexedDB (via Dexie.js)
- **Extension Storage**: chrome.storage.local
- **Cloud**: Provider APIs

### 4.4 Libraries
- **Crypto**: Web Crypto API (hashing)
- **Cloud SDKs**:
  - Google Drive: google-api-javascript-client
  - Dropbox: dropbox-sdk
  - OneDrive: @microsoft/microsoft-graph-client
- **Utilities**:
  - lodash-es (debounce, throttle)
  - date-fns (date formatting)
  - zod (schema validation)

### 4.5 Development Tools
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Version Control**: Git

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Basic extension structure and Excalidraw detection

**Tasks**:
1. Set up project structure with Vite + React + TypeScript
2. Create Manifest V3 configuration
3. Implement content script injection
4. Detect Excalidraw pages (excalidraw.com + self-hosted)
5. Monitor localStorage changes
6. Extract diagram data
7. Basic popup UI with status display

**Deliverables**:
- Extension loads and detects Excalidraw
- Can read diagram data from localStorage
- Shows detection status in popup

### Phase 2: Local Storage & Sync Engine (Week 2-3)
**Goal**: Implement local storage and sync logic

**Tasks**:
1. Set up IndexedDB with Dexie.js
2. Create data models (diagrams, settings, queue)
3. Implement sync queue system
4. Hash-based change detection (SHA-256)
5. Debounced save detection
6. Background worker setup
7. Message passing between components

**Deliverables**:
- Diagrams stored locally
- Change detection working
- Sync queue operational

### Phase 3: Google Drive Integration (Week 3-4)
**Goal**: First cloud provider implementation

**Tasks**:
1. OAuth2 setup with chrome.identity
2. Google Drive API integration
3. Upload diagram to Drive
4. Download diagram from Drive
5. List diagrams
6. Update/delete operations
7. Token refresh mechanism
8. Error handling

**Deliverables**:
- Full Google Drive sync working
- OAuth flow complete
- Upload/download functional

### Phase 4: Bidirectional Sync (Week 4-5)
**Goal**: Complete sync mechanism with conflict detection

**Tasks**:
1. Implement periodic cloud polling
2. Compare local vs cloud state
3. Conflict detection logic
4. Conflict resolution strategies
5. Apply cloud changes to local
6. Update UI with sync status
7. Retry mechanism for failed syncs

**Deliverables**:
- Two-way sync working
- Conflicts detected and handled
- Status updates visible

### Phase 5: UI Enhancement (Week 5-6)
**Goal**: Polished user interface

**Tasks**:
1. Options page for settings
2. Diagram browser/manager
3. Search functionality
4. Conflict resolution UI
5. Sync status indicators
6. Settings configuration
7. Onboarding flow

**Deliverables**:
- Complete UI for all features
- Intuitive user experience
- Proper error messages

### Phase 6: Additional Cloud Providers (Week 6-7)
**Goal**: Support Dropbox and OneDrive

**Tasks**:
1. Abstract cloud provider interface
2. Implement Dropbox adapter
3. Implement OneDrive adapter
4. Provider selection in settings
5. Migration between providers
6. Test all providers

**Deliverables**:
- Multi-provider support
- Easy switching between providers

### Phase 7: Advanced Features (Week 7-8)
**Goal**: Polish and additional capabilities

**Tasks**:
1. Offline mode
2. Version history
3. Export/import functionality
4. Diagram thumbnails
5. Optional encryption
6. Performance optimization
7. Comprehensive testing

**Deliverables**:
- Production-ready extension
- All features complete
- Tested and optimized

### Phase 8: Testing & Launch (Week 8-9)
**Goal**: Quality assurance and release

**Tasks**:
1. Unit tests
2. Integration tests
3. Manual testing across scenarios
4. Cross-browser testing (Chrome, Edge, Brave)
5. Performance testing
6. Security audit
7. Documentation
8. Chrome Web Store submission

**Deliverables**:
- Published extension
- Complete documentation
- User guide

---

## 6. File Structure

```
sync-excal/
├── src/
│   ├── background/
│   │   ├── index.ts                 # Service worker entry
│   │   ├── syncEngine.ts            # Core sync logic
│   │   ├── cloudManager.ts          # Cloud provider management
│   │   ├── queueManager.ts          # Sync queue handling
│   │   └── scheduler.ts             # Periodic sync scheduling
│   ├── content/
│   │   ├── index.ts                 # Content script entry
│   │   ├── excalidrawDetector.ts    # Detect Excalidraw pages
│   │   ├── storageMonitor.ts        # Monitor localStorage
│   │   └── diagramExtractor.ts      # Extract diagram data
│   ├── popup/
│   │   ├── index.tsx                # Popup entry
│   │   ├── Popup.tsx                # Main popup component
│   │   ├── SyncStatus.tsx           # Sync status display
│   │   └── QuickActions.tsx         # Quick action buttons
│   ├── options/
│   │   ├── index.tsx                # Options page entry
│   │   ├── Options.tsx              # Main options component
│   │   ├── CloudProviderSettings.tsx
│   │   ├── SyncSettings.tsx
│   │   └── ConflictSettings.tsx
│   ├── sidepanel/
│   │   ├── index.tsx                # Side panel entry
│   │   ├── DiagramBrowser.tsx       # Browse diagrams
│   │   ├── DiagramCard.tsx          # Diagram preview card
│   │   ├── SearchBar.tsx            # Search interface
│   │   └── ConflictResolver.tsx     # Conflict resolution UI
│   ├── lib/
│   │   ├── storage/
│   │   │   ├── db.ts                # IndexedDB setup (Dexie)
│   │   │   ├── models.ts            # Data models
│   │   │   └── queries.ts           # Database queries
│   │   ├── cloud/
│   │   │   ├── provider.interface.ts    # Cloud provider interface
│   │   │   ├── googleDrive.ts           # Google Drive implementation
│   │   │   ├── dropbox.ts               # Dropbox implementation
│   │   │   ├── onedrive.ts              # OneDrive implementation
│   │   │   └── factory.ts               # Provider factory
│   │   ├── crypto/
│   │   │   ├── hash.ts              # Hashing utilities
│   │   │   └── encryption.ts        # Optional encryption
│   │   ├── sync/
│   │   │   ├── conflictDetector.ts  # Detect conflicts
│   │   │   ├── conflictResolver.ts  # Resolve conflicts
│   │   │   └── syncCoordinator.ts   # Coordinate sync operations
│   │   └── utils/
│   │       ├── messaging.ts         # Message passing helpers
│   │       ├── logger.ts            # Logging utility
│   │       └── validators.ts        # Data validation
│   ├── types/
│   │   ├── diagram.ts               # Diagram type definitions
│   │   ├── sync.ts                  # Sync-related types
│   │   └── cloud.ts                 # Cloud provider types
│   └── assets/
│       ├── icons/                   # Extension icons
│       └── styles/                  # Global styles
├── public/
│   ├── manifest.json                # Extension manifest
│   ├── _locales/                    # Internationalization
│   └── icons/                       # Icon files
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── USER_GUIDE.md
│   ├── API.md
│   └── ARCHITECTURE.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 7. Key Technical Challenges & Solutions

### Challenge 1: Detecting Excalidraw Instances
**Problem**: Excalidraw can be used on excalidraw.com or self-hosted
**Solution**:
- Check for Excalidraw-specific DOM elements
- Look for localStorage keys matching Excalidraw pattern
- Detect React root with Excalidraw components
- Allow users to manually mark sites as Excalidraw

### Challenge 2: Large File Sizes
**Problem**: Diagrams with embedded images can be several MB
**Solution**:
- Compress JSON before upload (gzip)
- Implement chunked uploads for large files
- Show progress indicators
- Warn users about large diagrams
- Optional: Store images separately

### Challenge 3: Conflict Resolution
**Problem**: Same diagram edited on multiple devices offline
**Solution**:
- Implement vector clock or timestamp-based detection
- Calculate content hash for comparison
- Provide clear UI for conflict resolution
- Offer automatic resolution strategies
- Keep both versions until user decides

### Challenge 4: Service Worker Lifecycle
**Problem**: Service workers can be killed by browser
**Solution**:
- Use chrome.alarms for scheduled tasks
- Implement persistent queue in IndexedDB
- Resume operations on worker restart
- Handle interrupted uploads/downloads

### Challenge 5: OAuth Token Management
**Problem**: Tokens expire and need refresh
**Solution**:
- Store refresh tokens securely
- Implement automatic token refresh
- Handle 401 errors gracefully
- Re-authenticate if refresh fails
- Encrypt tokens before storage

### Challenge 6: Real-time Detection
**Problem**: Detecting localStorage changes without polling
**Solution**:
- Inject script into page context
- Override localStorage.setItem
- Emit custom events on changes
- Listen in content script
- Debounce to avoid excessive triggers

### Challenge 7: Cross-browser Compatibility
**Problem**: Extension should work in Chrome, Edge, Brave
**Solution**:
- Use standard WebExtension APIs
- Feature detection for browser-specific APIs
- Polyfills where needed
- Test on all target browsers

---

## 8. Security Considerations

### 8.1 Authentication
- Use OAuth2 (no password storage)
- Implement PKCE for OAuth flow
- Store tokens encrypted
- Automatic token refresh
- Clear tokens on logout

### 8.2 Data Protection
- HTTPS only for API calls
- Content Security Policy in manifest
- Sanitize diagram data
- Optional end-to-end encryption
- No third-party analytics

### 8.3 Permissions
Request minimal permissions:
- `storage` - For chrome.storage
- `identity` - For OAuth
- `alarms` - For scheduled sync
- `host_permissions` - For excalidraw.com

### 8.4 Privacy
- No tracking or telemetry
- No data sent to third parties
- Local-first architecture
- Clear privacy policy
- User data deletion option

---

## 9. User Experience Flow

### 9.1 First-time Setup
1. Install extension from Chrome Web Store
2. Click extension icon
3. Welcome screen appears
4. Choose cloud provider (Google Drive/Dropbox/OneDrive)
5. Click "Connect" button
6. OAuth consent screen opens
7. Grant permissions
8. Return to extension
9. Configuration complete
10. Visit excalidraw.com to test

### 9.2 Daily Usage
1. User opens excalidraw.com
2. Extension badge shows "Syncing..."
3. Creates or edits diagram
4. Extension auto-saves after 3 seconds of inactivity
5. Badge shows "Synced ✓"
6. User switches devices
7. Opens same Excalidraw
8. Extension detects cloud version
9. Automatically loads latest version
10. User continues editing

### 9.3 Conflict Handling
1. User edits diagram offline on Device A
2. User edits same diagram offline on Device B
3. Device A comes online → uploads changes
4. Device B comes online → detects conflict
5. Extension shows notification: "Conflict detected"
6. User clicks notification
7. Side panel opens showing both versions side-by-side
8. User selects preferred version or merges manually
9. Conflict resolved
10. Sync continues

---

## 10. Testing Strategy

### 10.1 Unit Tests
- Sync engine logic
- Hash calculation
- Conflict detection
- Data validation
- Cloud API mocks

### 10.2 Integration Tests
- Content script ↔ Background communication
- IndexedDB operations
- OAuth flow
- Cloud upload/download
- Queue processing

### 10.3 End-to-End Tests
- Full sync cycle
- Multi-device scenarios
- Conflict resolution
- Offline/online transitions
- Browser restart scenarios

### 10.4 Manual Testing
- Different Excalidraw instances
- Various diagram sizes
- Network interruptions
- Multiple cloud providers
- Edge cases

---

## 11. Performance Optimization

### 11.1 Strategies
- Debounce saves (3 seconds)
- Throttle cloud polling (5 minutes)
- Lazy load diagrams in browser
- Virtual scrolling for large lists
- Compress JSON before upload
- Cache cloud metadata locally
- Background processing for heavy operations
- Incremental sync (only changed diagrams)

### 11.2 Metrics to Monitor
- Time to sync
- Extension memory usage
- Network bandwidth used
- Storage space used
- UI responsiveness

---

## 12. Future Enhancements

### Phase 2 Features (Post-MVP)
1. **Collaboration**
   - Share diagrams with other users
   - Real-time collaboration support
   - Comments and annotations

2. **Advanced Sync**
   - Selective sync (choose which diagrams)
   - Sync preferences per diagram
   - Custom sync schedules

3. **Organization**
   - Folders and tags
   - Collections
   - Smart filters

4. **Integration**
   - Notion integration
   - GitHub integration (for documentation)
   - Slack notifications

5. **Export Options**
   - PDF export
   - SVG export
   - PNG export with customization

6. **Version Control**
   - Full version history
   - Restore previous versions
   - Compare versions visually

7. **Mobile Support**
   - Mobile browser extension (where supported)
   - Companion mobile app

---

## 13. Success Metrics

### 13.1 Technical Metrics
- Sync success rate > 99%
- Average sync time < 2 seconds
- Conflict rate < 1%
- Extension memory usage < 50MB
- Zero data loss incidents

### 13.2 User Metrics
- Daily active users
- Diagrams synced per user
- Average diagrams per user
- User retention rate
- Chrome Web Store rating > 4.5

---

## 14. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Cloud API changes | Medium | High | Use stable API versions, monitor deprecations |
| Quota limits exceeded | Medium | Medium | Warn users, optimize storage |
| Data loss during sync | Low | Critical | Implement backup mechanism, never delete without confirmation |
| OAuth issues | Medium | High | Robust error handling, clear user guidance |
| Browser updates breaking extension | Low | High | Regular testing, follow Chrome extension best practices |
| Excalidraw format changes | Medium | Medium | Version detection, migration scripts |

---

## 15. Budget Estimate (Development Time)

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 1: Foundation | 2 weeks | 80 hours |
| Phase 2: Storage & Sync Engine | 1 week | 40 hours |
| Phase 3: Google Drive Integration | 1 week | 40 hours |
| Phase 4: Bidirectional Sync | 1 week | 40 hours |
| Phase 5: UI Enhancement | 1 week | 40 hours |
| Phase 6: Additional Providers | 1 week | 40 hours |
| Phase 7: Advanced Features | 1 week | 40 hours |
| Phase 8: Testing & Launch | 1 week | 40 hours |
| **Total** | **9 weeks** | **360 hours** |

---

## 16. Dependencies

### 16.1 External Services
- Google Cloud Console (API credentials)
- Dropbox App Console
- Microsoft Azure (OneDrive)
- Chrome Web Store (publishing)

### 16.2 Development Prerequisites
- Node.js 18+
- npm/yarn/pnpm
- Chrome browser for testing
- Google Drive account for testing
- Basic knowledge of OAuth2

---

## Conclusion

This Chrome extension will provide a seamless, reliable way to sync Excalidraw diagrams across devices using popular cloud storage providers. The architecture is designed to be robust, extensible, and user-friendly.

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Create Google Cloud project for Drive API
4. Begin Phase 1 implementation
5. Iterate based on feedback

**Questions to Address Before Starting:**
- Which cloud provider should we prioritize first? (Recommended: Google Drive)
- What's the target release timeline?
- Are there any specific conflict resolution preferences?
- Should we include optional encryption from the start or add later?
- Any specific Excalidraw instances to support beyond excalidraw.com?
