-- Per-subscriber opt-out for "new poem published" emails.
-- Separate from subscribers.status: status is the master switch (unsubscribed
-- means no mail at all), this only governs the automatic publish notification.
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS notify_new_poems boolean NOT NULL DEFAULT true;

-- Records that a poem's publish notification has been sent. Claimed with a
-- conditional UPDATE so a retry or double-click can't send the list twice.
ALTER TABLE poems
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Recipient lookup is always "active AND opted in"
CREATE INDEX IF NOT EXISTS idx_subscribers_notify_new_poems
  ON subscribers (status) WHERE notify_new_poems;
