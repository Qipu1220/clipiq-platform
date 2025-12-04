-- Migration 011: Add counts to videos table
-- Description: Add likes_count and comments_count columns to videos table for performance
-- Date: 2025-12-04

-- Add columns if they don't exist
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0);

-- Create indexes for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_videos_likes_count ON videos(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_videos_comments_count ON videos(comments_count DESC);

-- Update existing counts (optional, but good for consistency if data exists)
-- This assumes likes and comments tables exist and are populated
UPDATE videos v
SET 
    likes_count = (SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id),
    comments_count = (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id);
