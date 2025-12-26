-- Migration 012: Create comment_reports table
-- Description: Table for comment moderation system
-- Date: 2025-12-12

-- Create comment_reports table
CREATE TABLE IF NOT EXISTS comment_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    reported_by_id UUID NOT NULL,
    reason TEXT NOT NULL,
    evidence_url VARCHAR(500) NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    reviewed_by_id UUID NULL,
    reviewed_at TIMESTAMP NULL,
    resolution_note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_reports_comment
        FOREIGN KEY (comment_id)
        REFERENCES comments(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_comment_reports_reported_by
        FOREIGN KEY (reported_by_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_comment_reports_reviewed_by
        FOREIGN KEY (reviewed_by_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- Create indexes for comment_reports
CREATE INDEX idx_comment_reports_status ON comment_reports(status);
CREATE INDEX idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX idx_comment_reports_reported_by_id ON comment_reports(reported_by_id);
CREATE INDEX idx_comment_reports_created_at ON comment_reports(created_at DESC);

-- Create composite index for duplicate checking
CREATE UNIQUE INDEX idx_comment_reports_unique_report 
    ON comment_reports(comment_id, reported_by_id) 
    WHERE status IN ('pending', 'reviewed');

-- Add comments
COMMENT ON TABLE comment_reports IS 'Reports about comment violations - moderated by staff';
COMMENT ON COLUMN comment_reports.evidence_url IS 'Optional evidence (screenshot, link)';
COMMENT ON COLUMN comment_reports.reviewed_by_id IS 'Staff/admin who reviewed the report';
COMMENT ON COLUMN comment_reports.reason IS 'Type of violation with optional details (e.g., "spam: Advertising content")';
