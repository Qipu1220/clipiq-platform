-- Migration 014: Add shares_count to videos table
-- Description: Add denormalized shares count for performance
-- Date: 2025-12-27

-- Add shares_count column
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;

-- Create index for sorting by shares
CREATE INDEX IF NOT EXISTS idx_videos_shares_count ON videos(shares_count DESC);

-- Update existing videos to have shares_count = 0
UPDATE videos SET shares_count = 0 WHERE shares_count IS NULL;

-- Add comment
COMMENT ON COLUMN videos.shares_count IS 'Cached count of video shares (updated on share/unshare)';

-- Optional: Create trigger to auto-update shares_count
-- (Alternatively, can be updated in application code)
CREATE OR REPLACE FUNCTION update_video_shares_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE videos SET shares_count = shares_count + 1 WHERE id = NEW.video_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE videos SET shares_count = GREATEST(shares_count - 1, 0) WHERE id = OLD.video_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shares_count
AFTER INSERT OR DELETE ON shares
FOR EACH ROW
EXECUTE FUNCTION update_video_shares_count();

COMMENT ON FUNCTION update_video_shares_count IS 'Auto-update videos.shares_count when shares are added/removed';
