# Excalidraw Sync - Chrome Extension

Automatically sync your Excalidraw diagrams to the cloud and access them across all your devices.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

- ✅ **Auto-sync** - Automatically detects and syncs Excalidraw diagrams as you work
- ⚡ **Real-time updates** - Instant synchronization across devices using Supabase Realtime
- 🔄 **Conflict resolution** - Smart conflict detection with multiple resolution strategies
- 🔒 **Secure** - OAuth2 authentication with row-level security
- 📱 **Multi-device** - Access your diagrams from any device
- 🌐 **Works everywhere** - Supports excalidraw.com and self-hosted instances
- 💾 **Offline support** - Queue sync operations when offline
- 🎨 **Beautiful UI** - Modern, intuitive interface

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Supabase Setup](#supabase-setup)
- [Development](#development)
- [Building](#building)
- [Usage](#usage)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18 or higher
- npm, yarn, or pnpm
- Supabase CLI (already installed and logged in ✓)
- Chrome/Edge/Brave browser for testing

## Installation

### 1. Clone and Install Dependencies

```bash
cd "/Users/gokul99/My Work/sync-excal"
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these from your Supabase project dashboard:
- Go to Project Settings → API
- Copy the Project URL and anon/public key

## Supabase Setup

### 1. Run Database Migrations

Since you have Supabase CLI installed and logged in, run:

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

Alternatively, run migrations manually:

```bash
# Run all migrations
supabase db push --file supabase/migrations/001_create_diagrams_table.sql
supabase db push --file supabase/migrations/002_create_sync_metadata_table.sql
```

### 2. Enable Realtime

In your Supabase dashboard:
1. Go to Database → Replication
2. Enable replication for the `diagrams` table
3. Or run this SQL in the SQL editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE diagrams;
```

### 3. Verify Setup

Run this query in the Supabase SQL editor to verify tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see `diagrams` and `sync_metadata` tables.

## Development

### Start Development Server

```bash
npm run dev
```

This will start Vite in development mode with hot reload.

### Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project
5. The extension should now appear in your extensions list

### Making Changes

The extension will auto-reload when you make changes to the code. If it doesn't:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the extension card

## Building

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist` folder.

### Create Extension Package

To create a `.crx` file for distribution:

1. Go to `chrome://extensions/`
2. Click "Pack extension"
3. Select the `dist` folder
4. Click "Pack extension"

Or use the Chrome Web Store Developer Dashboard to upload the `dist` folder.

## Usage

### First Time Setup

1. Install the extension
2. Click the extension icon in your browser toolbar
3. Click "Sign In" to open the options page
4. Create an account or sign in with your email and password
5. Configure your sync settings (optional)

### Syncing Diagrams

1. Visit [excalidraw.com](https://excalidraw.com) or your self-hosted instance
2. Create or edit a diagram
3. The extension automatically detects changes and syncs after 3 seconds of inactivity
4. Check the extension popup to see sync status
5. Access synced diagrams from the side panel

### Managing Diagrams

- **View all diagrams**: Click the extension icon → "Browse Diagrams"
- **Search diagrams**: Use the search bar in the side panel
- **Delete diagrams**: Click the trash icon on any diagram
- **Sync manually**: Click "Sync Now" in the popup

### Conflict Resolution

When the same diagram is edited on multiple devices, conflicts can occur:

1. **Manual** (default): You'll be prompted to choose which version to keep
2. **Latest wins**: Automatically keeps the most recent version
3. **Local wins**: Always keeps your local version
4. **Cloud wins**: Always keeps the cloud version

Configure this in Settings (extension icon → gear icon).

## Architecture

### Components

```
src/
├── background/         # Service worker (sync orchestration)
├── content/           # Content script (Excalidraw detection)
├── popup/             # Extension popup UI
├── options/           # Settings page
├── sidepanel/         # Diagram browser
├── lib/
│   ├── cloud/         # Cloud provider (Supabase)
│   ├── storage/       # Local storage (IndexedDB)
│   ├── sync/          # Sync engine
│   ├── supabase/      # Supabase client
│   └── utils/         # Utilities
└── types/             # TypeScript types
```

### Data Flow

1. **Content Script** monitors localStorage on Excalidraw pages
2. **Background Worker** receives diagram changes via messages
3. **Sync Engine** processes changes and syncs with Supabase
4. **Real-time** updates push changes to other devices
5. **UI Components** display sync status and manage diagrams

### Storage

- **IndexedDB**: Local diagram cache and metadata
- **chrome.storage.local**: Extension settings and auth tokens
- **Supabase**: Cloud storage and real-time sync

## Project Structure

```
sync-excal/
├── src/                    # Source code
├── public/                 # Static assets
├── supabase/              # Database migrations
├── dist/                  # Build output (git-ignored)
├── scripts/               # Build scripts
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── README.md              # This file
```

## Configuration

### Sync Settings

Configurable in the Options page:

- **Auto Sync**: Enable/disable automatic syncing
- **Sync Interval**: How often to check for cloud updates (1-30 minutes)
- **Conflict Resolution**: How to handle conflicts
- **Max Retries**: Number of retry attempts for failed syncs

### Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_DEV_MODE`: Enable development mode (true/false)

## Troubleshooting

### Extension not detecting Excalidraw

- Ensure you're on excalidraw.com or a supported URL
- Check browser console for errors
- Reload the Excalidraw page

### Sync not working

- Verify you're signed in (check popup)
- Check Supabase credentials in `.env`
- Check network tab for API errors
- Verify Supabase migrations ran successfully

### Build errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Clear Vite cache
rm -rf dist
npm run build
```

### Database errors

```bash
# Reset database (WARNING: deletes all data)
supabase db reset

# Re-run migrations
supabase db push
```

## Security

- Uses OAuth2 for authentication
- Row Level Security (RLS) ensures users only see their own data
- Tokens stored securely in `chrome.storage.local`
- All API calls over HTTPS
- No tracking or analytics

## Performance

- Debounced saves (3 seconds) to avoid excessive syncing
- Hash-based change detection (only syncs when changed)
- Compressed JSON for smaller payloads
- Efficient IndexedDB queries
- Background processing doesn't block UI

## Browser Support

- ✅ Google Chrome 88+
- ✅ Microsoft Edge 88+
- ✅ Brave Browser
- ⚠️ Firefox (requires manifest adaptation)
- ❌ Safari (WebExtensions API limited)

## Known Limitations

- Maximum diagram size: ~10MB (Supabase limit)
- Free tier: 500MB database storage
- Real-time requires active Supabase connection
- Self-hosted Excalidraw must allow localStorage access

## Roadmap

- [ ] Selective sync (choose which diagrams to sync)
- [ ] Folder organization
- [ ] Tags and categories
- [ ] Diagram sharing
- [ ] Export to multiple formats
- [ ] Version history
- [ ] Dropbox integration
- [ ] Google Drive integration

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Tips

### Debugging

- Background worker: `chrome://extensions/` → Extension details → "Inspect views: service worker"
- Content script: Open DevTools on Excalidraw page
- Popup/Options: Right-click extension → Inspect

### Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Logs

All logs are prefixed with component name:
- `[ExcalidrawSync]` - General
- `[Content]` - Content script
- `[Background]` - Background worker
- `[Sync]` - Sync engine

Enable verbose logging in development mode.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite + CRXJS
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Local Storage**: Dexie (IndexedDB)
- **Icons**: Lucide React
- **Date Utils**: date-fns

## License

MIT License - see LICENSE file for details

## Support

- Report bugs: [GitHub Issues](https://github.com/yourusername/excalidraw-sync/issues)
- Feature requests: [GitHub Discussions](https://github.com/yourusername/excalidraw-sync/discussions)
- Email: your@email.com

## Acknowledgments

- [Excalidraw](https://excalidraw.com) - Amazing drawing tool
- [Supabase](https://supabase.com) - Backend infrastructure
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - Platform

---

Made with ❤️ by [Your Name]

**Note**: This extension is not affiliated with Excalidraw. It's an independent project to enhance the Excalidraw experience.
