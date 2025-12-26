-- Migration 001: Create users table (UUID Primary Key Version)
-- Description: Core user table with UUID PK, authentication and profile data
-- Date: 2025-11-23 (Revised)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'staff', 'user')),
    password VARCHAR(255) NOT NULL, -- bcrypt hash
    banned BOOLEAN DEFAULT FALSE,
    ban_expiry TIMESTAMP NULL, -- NULL means permanent ban
    ban_reason TEXT NULL,
    warnings INTEGER DEFAULT 0 CHECK (warnings >= 0),
    is_demoted BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500), -- MinIO S3 URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_banned_expiry ON users(banned, ban_expiry) WHERE banned = TRUE;
CREATE INDEX idx_users_is_demoted ON users(is_demoted) WHERE role = 'staff';
CREATE INDEX idx_users_created_at ON users(created_at);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE users IS 'Core users table - supports admin, staff, and regular users';
COMMENT ON COLUMN users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN users.username IS 'Unique username for display and @ mentions';
COMMENT ON COLUMN users.email IS 'Email for password recovery and notifications';
COMMENT ON COLUMN users.role IS 'User role: admin (full access), staff (moderation), user (regular)';
COMMENT ON COLUMN users.password IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.banned IS 'Whether user is currently banned';
COMMENT ON COLUMN users.ban_expiry IS 'Ban expiration timestamp (NULL = permanent)';
COMMENT ON COLUMN users.ban_reason IS 'Reason for ban (shown to user)';
COMMENT ON COLUMN users.warnings IS 'Number of warnings received';
COMMENT ON COLUMN users.is_demoted IS 'Flag indicating if staff member has been demoted (still has staff role but cannot access staff features)';
COMMENT ON COLUMN users.display_name IS 'Display name (can be changed, optional)';
COMMENT ON COLUMN users.bio IS 'User biography/description';
COMMENT ON COLUMN users.avatar_url IS 'Avatar image URL from MinIO S3';

