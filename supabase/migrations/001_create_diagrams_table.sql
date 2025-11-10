-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create diagrams table
CREATE TABLE diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,

  -- Ensure unique diagram names per user
  UNIQUE(user_id, name)
);

-- Create indexes for better query performance
CREATE INDEX diagrams_user_id_idx ON diagrams(user_id);
CREATE INDEX diagrams_updated_at_idx ON diagrams(updated_at DESC);
CREATE INDEX diagrams_hash_idx ON diagrams(hash);

-- Enable Row Level Security
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Users can only see their own diagrams
CREATE POLICY "Users can view their own diagrams"
  ON diagrams FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own diagrams
CREATE POLICY "Users can insert their own diagrams"
  ON diagrams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own diagrams
CREATE POLICY "Users can update their own diagrams"
  ON diagrams FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own diagrams
CREATE POLICY "Users can delete their own diagrams"
  ON diagrams FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_diagrams_updated_at
  BEFORE UPDATE ON diagrams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate diagram size
CREATE OR REPLACE FUNCTION calculate_diagram_size()
RETURNS TRIGGER AS $$
BEGIN
  NEW.size = LENGTH(NEW.data::TEXT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate size
CREATE TRIGGER calculate_diagrams_size
  BEFORE INSERT OR UPDATE ON diagrams
  FOR EACH ROW
  EXECUTE FUNCTION calculate_diagram_size();
