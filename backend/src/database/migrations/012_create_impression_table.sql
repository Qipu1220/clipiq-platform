
CREATE TABLE IF NOT EXISTS impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  session_id UUID NOT NULL,
  position INTEGER NOT NULL,
  source TEXT NOT NULL,                 -- personal/trending/random
  model_version TEXT,
  shown_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_impr_user_time ON impressions(user_id, shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_impr_user_session ON impressions(user_id, session_id);

ALTER TABLE view_history
ADD COLUMN IF NOT EXISTS impression_id UUID;

ALTER TABLE view_history
ADD CONSTRAINT fk_view_history_impr
FOREIGN KEY (impression_id) REFERENCES impressions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_view_impr ON view_history(impression_id);
