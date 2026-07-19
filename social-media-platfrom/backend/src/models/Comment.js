export const COMMENT_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text_content TEXT NOT NULL,
  moderation_status VARCHAR(20) DEFAULT 'pending',
  risk_score INT DEFAULT 0,
  moderation_reason TEXT,
  ai_response JSONB,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
`
