-- Migration 010: Create playlists tables
-- Description: User-created playlists and playlist-video relationships
-- Date: 2025-11-23

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_playlists_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Create playlist_videos junction table
CREATE TABLE IF NOT EXISTS playlist_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL,
    video_id UUID NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_playlist_videos_playlist
        FOREIGN KEY (playlist_id)
        REFERENCES playlists(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_playlist_videos_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,
    CONSTRAINT unique_playlist_video
        UNIQUE (playlist_id, video_id),
    CONSTRAINT unique_playlist_position
        UNIQUE (playlist_id, position)
);

-- Create indexes for playlists
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_visibility ON playlists(visibility);
CREATE INDEX idx_playlists_created_at ON playlists(created_at DESC);

-- Create indexes for playlist_videos
CREATE INDEX idx_playlist_videos_playlist_id ON playlist_videos(playlist_id);
CREATE INDEX idx_playlist_videos_video_id ON playlist_videos(video_id);
CREATE INDEX idx_playlist_videos_position ON playlist_videos(playlist_id, position);

-- Auto-update updated_at trigger for playlists
CREATE TRIGGER playlists_updated_at
    BEFORE UPDATE ON playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE playlists IS 'User-created playlists for organizing videos';
COMMENT ON TABLE playlist_videos IS 'Junction table linking playlists to videos with ordering';
COMMENT ON COLUMN playlists.visibility IS 'Playlist visibility: public, unlisted, or private';
COMMENT ON COLUMN playlist_videos.position IS 'Position of video in playlist (for ordering)';
