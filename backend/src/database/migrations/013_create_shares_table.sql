-- Migration 013: Create shares table
-- Description: Track video shares (social media, copy link, etc.)
-- Date: 2025-12-27

-- Create shares table
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,  -- NULL for anonymous/guest shares
    video_id UUID NOT NULL,
    share_type VARCHAR(50) NOT NULL, -- 'link', 'facebook', 'twitter', 'whatsapp', 'embed', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shares_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_shares_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_shares_user_id ON shares(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_shares_video_id ON shares(video_id);
CREATE INDEX idx_shares_created_at ON shares(created_at DESC);
CREATE INDEX idx_shares_type ON shares(share_type);

-- Composite index for analytics
CREATE INDEX idx_shares_video_created ON shares(video_id, created_at DESC);

-- Add comments
COMMENT ON TABLE shares IS 'Track video shares across various platforms';
COMMENT ON COLUMN shares.user_id IS 'User who shared (NULL for anonymous)';
COMMENT ON COLUMN shares.video_id IS 'Video that was shared';
COMMENT ON COLUMN shares.share_type IS 'Share method: link, facebook, twitter, whatsapp, embed, etc.';
COMMENT ON COLUMN shares.created_at IS 'Timestamp when video was shared';
