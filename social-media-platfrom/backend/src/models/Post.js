export const POST_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text_content TEXT,
  image_url TEXT,
  tag VARCHAR(60),
  moderation_status VARCHAR(20) DEFAULT 'pending',
  risk_score INT DEFAULT 0,
  moderation_reason TEXT,
  ai_response JSONB,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Migration for existing databases created before moderation fields existed.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_response JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
`
