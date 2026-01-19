-- Migration: Add likes and comments tables
-- Run this in your Supabase SQL Editor

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

-- Indexes
CREATE INDEX idx_likes_poem_id ON likes(poem_id);
CREATE INDEX idx_likes_visitor_id ON likes(visitor_id);
CREATE INDEX idx_comments_poem_id ON comments(poem_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

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
