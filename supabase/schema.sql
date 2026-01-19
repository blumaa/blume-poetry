-- Blumenous Poetry Database Schema
-- Run this in your Supabase SQL Editor

-- Poems table
CREATE TABLE poems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  plain_text TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  url TEXT
);

-- Subscribers table
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  verified BOOLEAN DEFAULT FALSE
);

-- Email logs table
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  subject TEXT NOT NULL,
  poem_id UUID REFERENCES poems(id),
  recipient_count INTEGER,
  status TEXT DEFAULT 'sent'
);

-- Likes table (one like per visitor per poem)
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poem_id UUID NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poem_id, visitor_id)
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poem_id UUID NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_poems_slug ON poems(slug);
CREATE INDEX idx_poems_published_at ON poems(published_at DESC);
CREATE INDEX idx_poems_status ON poems(status);
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_likes_poem_id ON likes(poem_id);
CREATE INDEX idx_likes_visitor_id ON likes(visitor_id);
CREATE INDEX idx_comments_poem_id ON comments(poem_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Poems policies: public read, admin write
CREATE POLICY "Public can read published poems" ON poems
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admin can read all poems" ON poems
  FOR SELECT USING (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

CREATE POLICY "Admin can insert poems" ON poems
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

CREATE POLICY "Admin can update poems" ON poems
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

CREATE POLICY "Admin can delete poems" ON poems
  FOR DELETE USING (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

-- Subscribers policies: public can subscribe, admin full access
CREATE POLICY "Public can subscribe" ON subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can read subscribers" ON subscribers
  FOR SELECT USING (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

CREATE POLICY "Admin can update subscribers" ON subscribers
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

CREATE POLICY "Admin can delete subscribers" ON subscribers
  FOR DELETE USING (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

-- Email logs policies: admin only
CREATE POLICY "Admin can access email logs" ON email_logs
  FOR ALL USING (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

-- Likes policies: public read/insert/delete
CREATE POLICY "Public can read likes" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Public can insert likes" ON likes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can delete own likes" ON likes
  FOR DELETE USING (true);

-- Comments policies: public read/insert, admin can delete
CREATE POLICY "Public can read comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Public can insert comments" ON comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can delete comments" ON comments
  FOR DELETE USING (auth.jwt() ->> 'email' = 'desmond.blume@gmail.com');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on poems
CREATE TRIGGER update_poems_updated_at
  BEFORE UPDATE ON poems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
