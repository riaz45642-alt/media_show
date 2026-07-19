export const NOTIFICATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL,
  type VARCHAR(30) NOT NULL,
  text TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"likes":true,"comments":true,"mentions":true,"followers":true,"messages":true,"moderation":true,"appeals":true,"reports":true,"security":true,"system":true}';
`
