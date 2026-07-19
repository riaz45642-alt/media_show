// User model shape (Postgres). Run this as a migration when connecting a real DB.
export const USER_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  age INT NOT NULL,
  age_group VARCHAR(20) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  safe_zone_score INT DEFAULT 80,
  parent_email VARCHAR(160),
  role VARCHAR(20) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  moderation_status VARCHAR(20) DEFAULT 'safe',
  risk_score INT DEFAULT 0,
  moderation_reason TEXT,
  warnings_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Migration for existing databases.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'safe';
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS warnings_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
`
