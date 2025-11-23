-- Migration 003: Create comments table (UUID Primary Key Version)
-- Description: Comments on videos with nested reply support
-- Date: 2025-11-23 (Revised)

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    user_id UUID NOT NULL,
    parent_id UUID NULL, -- For nested replies
    text TEXT NOT NULL,
    edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent
        FOREIGN KEY (parent_id)
        REFERENCES comments(id)
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_comments_video_id ON comments(video_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Auto-update updated_at trigger
CREATE TRIGGER comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE comments IS 'User comments on videos with nested reply support';
COMMENT ON COLUMN comments.video_id IS 'Video being commented on';
COMMENT ON COLUMN comments.user_id IS 'User who made the comment';
COMMENT ON COLUMN comments.parent_id IS 'Parent comment ID for nested replies (NULL = top-level)';
COMMENT ON COLUMN comments.text IS 'Comment content';
COMMENT ON COLUMN comments.edited IS 'Whether comment was edited';

