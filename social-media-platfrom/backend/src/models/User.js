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
  created_at TIMESTAMP DEFAULT now()
);
`
