export const POST_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text_content TEXT,
  image_url TEXT,
  tag VARCHAR(60),
  moderation_status VARCHAR(20) DEFAULT 'pending',
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
`
