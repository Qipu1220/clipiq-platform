-- Migration: Add is_demoted column to users table
-- Description: Adds is_demoted boolean column for staff management
-- Date: 2025-12-27

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_demoted BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users.is_demoted IS 'Flag indicating if staff member has been demoted (still has staff role but cannot access staff features)';

CREATE INDEX IF NOT EXISTS idx_users_is_demoted ON users(is_demoted) WHERE role = 'staff';
