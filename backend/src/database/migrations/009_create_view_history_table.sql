-- Migration 009: Create view_history table
-- Description: Track user video views and watch time
-- Date: 2025-11-23

-- Create view_history table
CREATE TABLE IF NOT EXISTS view_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    video_id UUID NOT NULL,
    watch_duration INTEGER CHECK (watch_duration >= 0), -- Seconds watched
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_view_history_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_view_history_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_view_history_user_id ON view_history(user_id);
CREATE INDEX idx_view_history_video_id ON view_history(video_id);
CREATE INDEX idx_view_history_user_video ON view_history(user_id, video_id);
CREATE INDEX idx_view_history_created_at ON view_history(created_at DESC);

-- Add comments
COMMENT ON TABLE view_history IS 'Track user video views and watch time for analytics';
COMMENT ON COLUMN view_history.user_id IS 'User who watched the video';
COMMENT ON COLUMN view_history.video_id IS 'Video that was watched';
COMMENT ON COLUMN view_history.watch_duration IS 'Number of seconds watched';
COMMENT ON COLUMN view_history.completed IS 'Whether user watched entire video';
