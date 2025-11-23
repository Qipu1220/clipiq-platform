-- Migration 002: Create videos table (UUID Primary Key Version)
-- Description: Video metadata table (actual files stored in MinIO S3)
-- Date: 2025-11-23 (Revised)

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    uploader_id UUID NOT NULL,
    thumbnail_url VARCHAR(500), -- MinIO S3 URL
    video_url VARCHAR(500) NOT NULL, -- MinIO S3 key/URL
    duration INTEGER CHECK (duration >= 0), -- Duration in seconds
    views INTEGER DEFAULT 0 CHECK (views >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'flagged')),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_videos_uploader 
        FOREIGN KEY (uploader_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_videos_uploader_id ON videos(uploader_id);
CREATE INDEX idx_videos_upload_date ON videos(upload_date DESC);
CREATE INDEX idx_videos_views ON videos(views DESC);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_title ON videos USING gin(to_tsvector('english', title)); -- Full-text search

-- Auto-update updated_at trigger
CREATE TRIGGER videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE videos IS 'Video metadata - actual video files stored in MinIO S3';
COMMENT ON COLUMN videos.id IS 'UUID identifier for the video';
COMMENT ON COLUMN videos.uploader_id IS 'UUID of the uploader (references users.id)';
COMMENT ON COLUMN videos.thumbnail_url IS 'Thumbnail image URL from MinIO S3';
COMMENT ON COLUMN videos.video_url IS 'Video file URL/key in MinIO S3';
COMMENT ON COLUMN videos.duration IS 'Video duration in seconds';
COMMENT ON COLUMN videos.views IS 'Total view count';
COMMENT ON COLUMN videos.status IS 'Video status: active, deleted, or flagged';

