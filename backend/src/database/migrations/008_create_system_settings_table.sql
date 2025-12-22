-- Migration 008: Create system_settings table
-- Description: Global system configuration (maintenance mode, etc.)
-- Date: 2025-11-23

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
    ('service_maintenance_mode', 'false', 'Enable/disable service maintenance mode (admin and staff can access, regular users cannot)'),
    ('app_version', '1.0.0', 'Current application version'),
    ('max_video_size_mb', '500', 'Maximum video file size in MB'),
    ('max_upload_per_day', '10', 'Maximum uploads per user per day'),
    ('max_upload_size_mb', '500', 'Maximum upload size in MB'),
    ('max_video_duration_minutes', '60', 'Maximum video duration in minutes')
ON CONFLICT (key) DO NOTHING;

-- Add comments
COMMENT ON TABLE system_settings IS 'Global system configuration settings (key-value store)';
COMMENT ON COLUMN system_settings.key IS 'Setting key (unique identifier)';
COMMENT ON COLUMN system_settings.value IS 'Setting value (stored as text)';
COMMENT ON COLUMN system_settings.description IS 'Human-readable description of the setting';
