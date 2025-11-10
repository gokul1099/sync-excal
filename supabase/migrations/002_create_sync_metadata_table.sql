-- Create sync metadata table for tracking sync operations
CREATE TABLE sync_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  diagram_id UUID REFERENCES diagrams(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  sync_count INTEGER DEFAULT 0,
  last_error TEXT,

  UNIQUE(user_id, diagram_id, device_id)
);

-- Create indexes
CREATE INDEX sync_metadata_user_id_idx ON sync_metadata(user_id);
CREATE INDEX sync_metadata_diagram_id_idx ON sync_metadata(diagram_id);
CREATE INDEX sync_metadata_last_synced_idx ON sync_metadata(last_synced DESC);

-- Enable Row Level Security
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sync metadata"
  ON sync_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync metadata"
  ON sync_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync metadata"
  ON sync_metadata FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync metadata"
  ON sync_metadata FOR DELETE
  USING (auth.uid() = user_id);
