-- Migration 006: Create subscriptions table (UUID Primary Key Version)
-- Description: Self-referencing Many-to-Many for user subscriptions/follows
-- Date: 2025-11-23 (Revised)

-- Create subscriptions table with UUID PK
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subscriptions_follower
        FOREIGN KEY (follower_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_following
        FOREIGN KEY (following_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_subscriptions_no_self_follow
        CHECK (follower_id != following_id),
    CONSTRAINT unique_follower_following
        UNIQUE (follower_id, following_id)
);

-- Create indexes
CREATE INDEX idx_subscriptions_follower_id ON subscriptions(follower_id);
CREATE INDEX idx_subscriptions_following_id ON subscriptions(following_id);
CREATE INDEX idx_subscriptions_created_at ON subscriptions(created_at DESC);

-- Add comments
COMMENT ON TABLE subscriptions IS 'User subscriptions - users follow other users (channels)';
COMMENT ON COLUMN subscriptions.follower_id IS 'User who is following (subscriber)';
COMMENT ON COLUMN subscriptions.following_id IS 'User being followed (content creator)';
COMMENT ON CONSTRAINT chk_subscriptions_no_self_follow ON subscriptions IS 'Users cannot subscribe to themselves';

