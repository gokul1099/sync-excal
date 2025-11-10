# Supabase Setup

## Running Migrations

Since you have Supabase CLI installed and logged in, run these migrations:

```bash
# Navigate to the project root
cd /Users/gokul99/My\ Work/sync-excal

# Run all migrations
supabase db push

# Or run migrations individually
supabase db push --file supabase/migrations/001_create_diagrams_table.sql
supabase db push --file supabase/migrations/002_create_sync_metadata_table.sql
```

## Database Schema

### Tables

#### `diagrams`
Stores Excalidraw diagram data

- `id` (UUID) - Primary key
- `user_id` (UUID) - References auth.users
- `name` (TEXT) - Diagram name
- `data` (JSONB) - Full Excalidraw JSON
- `hash` (TEXT) - SHA-256 hash for change detection
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp (auto-updated)
- `device_id` (TEXT) - Device that last modified
- `size` (INTEGER) - Size in bytes (auto-calculated)

#### `sync_metadata`
Tracks sync operations per device

- `id` (UUID) - Primary key
- `user_id` (UUID) - References auth.users
- `diagram_id` (UUID) - References diagrams
- `device_id` (TEXT) - Device identifier
- `last_synced` (TIMESTAMPTZ) - Last sync time
- `sync_count` (INTEGER) - Number of syncs
- `last_error` (TEXT) - Last error message if any

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data.

### Realtime

To enable realtime subscriptions, run in Supabase dashboard SQL editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE diagrams;
```

Or enable via dashboard: Database > Replication > Enable for diagrams table

## Environment Variables

Make sure your `.env` file has:

```
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these from your Supabase project settings.
