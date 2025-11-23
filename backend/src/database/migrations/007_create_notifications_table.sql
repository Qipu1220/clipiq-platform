-- Migration 007: Create notifications table (UUID Primary Key Version)
-- Description: User notifications for various events (extensible design)
-- Date: 2025-11-23 (Revised)

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('new_video', 'new_comment', 'new_like', 'new_subscriber', 'video_flagged', 'ban_warning', 'ban_appeal_resolved')),
    receiver_id UUID NOT NULL,
    actor_id UUID NULL, -- User who triggered the notification
    video_id UUID NULL,
    comment_id UUID NULL,
    message TEXT NULL, -- Optional custom message
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_actor
        FOREIGN KEY (actor_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_notifications_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_notifications_comment
        FOREIGN KEY (comment_id)
        REFERENCES comments(id)
        ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_notifications_receiver_id ON notifications(receiver_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_receiver_unread ON notifications(receiver_id, read) 
    WHERE read = FALSE;

-- Add comments
COMMENT ON TABLE notifications IS 'User notifications - extensible design for multiple event types';
COMMENT ON COLUMN notifications.type IS 'Notification type (new_video, new_comment, new_like, etc)';
COMMENT ON COLUMN notifications.receiver_id IS 'User who receives the notification';
COMMENT ON COLUMN notifications.actor_id IS 'User who triggered the notification (NULL for system notifications)';
COMMENT ON COLUMN notifications.video_id IS 'Related video (if applicable)';
COMMENT ON COLUMN notifications.comment_id IS 'Related comment (if applicable)';
COMMENT ON COLUMN notifications.message IS 'Optional custom notification message';
COMMENT ON COLUMN notifications.read IS 'Whether notification has been read';

