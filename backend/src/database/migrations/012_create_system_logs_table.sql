-- Migration 012: Create system_logs table
-- Description: Centralized logging for admin/staff actions and system events
-- Date: 2025-12-12

-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(50) NOT NULL,
    performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    details TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_system_logs_action_type ON system_logs(action_type);
CREATE INDEX idx_system_logs_performed_by ON system_logs(performed_by_id);
CREATE INDEX idx_system_logs_target_user ON system_logs(target_user_id);
CREATE INDEX idx_system_logs_target_video ON system_logs(target_video_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);

-- Add comments
COMMENT ON TABLE system_logs IS 'Centralized logging for admin/staff actions and system events';
COMMENT ON COLUMN system_logs.action_type IS 'Type of action: user_banned, staff_promoted, maintenance_toggle, etc.';
COMMENT ON COLUMN system_logs.performed_by_id IS 'User who performed the action (admin/staff)';
COMMENT ON COLUMN system_logs.target_user_id IS 'User affected by the action (if applicable)';
COMMENT ON COLUMN system_logs.target_video_id IS 'Video affected by the action (if applicable)';
COMMENT ON COLUMN system_logs.details IS 'Human-readable description of the action';
COMMENT ON COLUMN system_logs.metadata IS 'Additional structured data (JSON)';

