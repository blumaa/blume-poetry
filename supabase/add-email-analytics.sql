-- Email Analytics Migration
-- Run this in your Supabase SQL Editor

-- Add Resend email ID to email_logs for tracking
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS resend_email_id TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS unique_opens INTEGER DEFAULT 0;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS unique_clicks INTEGER DEFAULT 0;

-- Email events table for detailed tracking
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES email_logs(id) ON DELETE CASCADE,
  resend_email_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  recipient_email TEXT,
  link_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email events
CREATE INDEX IF NOT EXISTS idx_email_events_email_log_id ON email_events(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_events_resend_email_id ON email_events(resend_email_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at DESC);

-- Enable RLS
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Email events policies: admin only, plus service role for webhooks
CREATE POLICY "Admin can read email events" ON email_events
  FOR SELECT USING (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

CREATE POLICY "Service role can insert email events" ON email_events
  FOR INSERT WITH CHECK (true);

-- Update email_logs index for resend_email_id
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_email_id ON email_logs(resend_email_id);

-- Function to increment email stats
CREATE OR REPLACE FUNCTION increment_email_stat(log_id UUID, stat_column TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE email_logs SET %I = COALESCE(%I, 0) + 1 WHERE id = $1', stat_column, stat_column)
  USING log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
