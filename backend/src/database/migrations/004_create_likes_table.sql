-- Migration 004: Create likes table (UUID Primary Key Version)
-- Description: Junction table for user-video likes (Many-to-Many)
-- Date: 2025-11-23 (Revised)

-- Create likes table with UUID PK and unique constraint
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    video_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_likes_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_likes_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,
    CONSTRAINT unique_user_video_like
        UNIQUE (user_id, video_id)
);

-- Create indexes for performance
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_video_id ON likes(video_id);
CREATE INDEX idx_likes_created_at ON likes(created_at DESC);

-- Add comments
COMMENT ON TABLE likes IS 'Many-to-Many relationship between users and videos for likes';
COMMENT ON COLUMN likes.user_id IS 'User who liked the video';
COMMENT ON COLUMN likes.video_id IS 'Video that was liked';
COMMENT ON COLUMN likes.created_at IS 'Timestamp when like was added';

