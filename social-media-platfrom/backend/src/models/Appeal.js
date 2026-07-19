export const APPEAL_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL,
  content_id UUID NOT NULL,
  original_status VARCHAR(20),
  ai_reason TEXT,
  risk_score INT DEFAULT 0,
  explanation TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  moderator_note TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appeals_user ON appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
`
