-- Add pinned column to poems table for sidebar pinning
ALTER TABLE poems ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false NOT NULL;

-- Index for efficient pinned queries
CREATE INDEX IF NOT EXISTS idx_poems_pinned ON poems (pinned) WHERE pinned = true;
