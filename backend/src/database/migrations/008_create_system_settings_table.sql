-- Migration 008: Create system_settings table (OPTIONAL)
-- Description: Global system configuration (maintenance mode, etc.)
-- Date: 2025-11-23 (No changes - already uses string PK)
-- Note: This table is optional and may not be needed if using environment variables

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_system_settings_timestamp
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
    ('app_version', '1.0.0', 'Current application version'),
    ('max_video_size_mb', '500', 'Maximum video file size in MB'),
    ('max_upload_per_day', '10', 'Maximum uploads per user per day')
ON CONFLICT (key) DO NOTHING;

-- Add comments
COMMENT ON TABLE system_settings IS 'Global system configuration settings (key-value store)';
COMMENT ON COLUMN system_settings.key IS 'Setting key (unique identifier)';
COMMENT ON COLUMN system_settings.value IS 'Setting value (stored as text)';
COMMENT ON COLUMN system_settings.description IS 'Human-readable description of the setting';
    ('max_upload_size_mb', '500'),
    ('max_video_duration_minutes', '60')
ON CONFLICT (key) DO NOTHING;

-- Add comments
COMMENT ON TABLE system_settings IS 'Global system configuration - key-value store';
COMMENT ON COLUMN system_settings.key IS 'Setting key (unique identifier)';
COMMENT ON COLUMN system_settings.value IS 'Setting value (stored as text, parse as needed)';
COMMENT ON COLUMN system_settings.updated_at IS 'Last update timestamp (auto-updated)';

