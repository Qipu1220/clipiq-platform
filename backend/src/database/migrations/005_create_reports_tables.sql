-- Migration 005: Create reports tables (user_reports, video_reports, appeals)
-- Description: Tables for content moderation system (UUID Primary Key Version)
-- Date: 2025-11-23 (Revised)

-- Create user_reports table
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_user_id UUID NOT NULL,
    reported_by_id UUID NOT NULL,
    reason TEXT NOT NULL,
    evidence_url VARCHAR(500) NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    reviewed_by_id UUID NULL,
    reviewed_at TIMESTAMP NULL,
    resolution_note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_reports_reported_user
        FOREIGN KEY (reported_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_reports_reported_by
        FOREIGN KEY (reported_by_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_reports_reviewed_by
        FOREIGN KEY (reviewed_by_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_user_reports_not_self
        CHECK (reported_user_id != reported_by_id)
);

-- Create video_reports table
CREATE TABLE IF NOT EXISTS video_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL,
    reported_by_id UUID NOT NULL,
    reason TEXT NOT NULL,
    evidence_url VARCHAR(500) NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    reviewed_by_id UUID NULL,
    reviewed_at TIMESTAMP NULL,
    resolution_note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_video_reports_video
        FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_video_reports_reported_by
        FOREIGN KEY (reported_by_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_video_reports_reviewed_by
        FOREIGN KEY (reviewed_by_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- Create appeals table
CREATE TABLE IF NOT EXISTS appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    reviewed_by_id UUID NULL,
    reviewed_at TIMESTAMP NULL,
    resolution_note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appeals_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_appeals_reviewed_by
        FOREIGN KEY (reviewed_by_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- Create indexes for user_reports
CREATE INDEX idx_user_reports_status ON user_reports(status);
CREATE INDEX idx_user_reports_reported_user_id ON user_reports(reported_user_id);
CREATE INDEX idx_user_reports_reported_by_id ON user_reports(reported_by_id);
CREATE INDEX idx_user_reports_created_at ON user_reports(created_at DESC);

-- Create indexes for video_reports
CREATE INDEX idx_video_reports_status ON video_reports(status);
CREATE INDEX idx_video_reports_video_id ON video_reports(video_id);
CREATE INDEX idx_video_reports_reported_by_id ON video_reports(reported_by_id);
CREATE INDEX idx_video_reports_created_at ON video_reports(created_at DESC);

-- Create indexes for appeals
CREATE INDEX idx_appeals_status ON appeals(status);
CREATE INDEX idx_appeals_user_id ON appeals(user_id);
CREATE INDEX idx_appeals_created_at ON appeals(created_at DESC);

-- Add comments
COMMENT ON TABLE user_reports IS 'Reports about user violations - moderated by staff';
COMMENT ON TABLE video_reports IS 'Reports about video violations - moderated by staff';
COMMENT ON TABLE appeals IS 'Ban appeals from users - reviewed by staff/admin';
COMMENT ON COLUMN user_reports.evidence_url IS 'Optional evidence (screenshot, link)';
COMMENT ON COLUMN user_reports.reviewed_by_id IS 'Staff/admin who reviewed the report';
COMMENT ON COLUMN video_reports.evidence_url IS 'Optional evidence (screenshot, link)';
COMMENT ON COLUMN video_reports.reviewed_by_id IS 'Staff/admin who reviewed the report';
COMMENT ON COLUMN appeals.reviewed_by_id IS 'Staff/admin who reviewed the appeal';

