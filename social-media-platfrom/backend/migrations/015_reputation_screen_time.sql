ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS reputation_score integer NOT NULL DEFAULT 100 CHECK (reputation_score >= 0);

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS daily_screen_time_minutes integer
    CHECK (daily_screen_time_minutes IS NULL OR daily_screen_time_minutes BETWEEN 15 AND 1440);

CREATE TABLE IF NOT EXISTS reputation_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta integer NOT NULL CHECK (delta BETWEEN -100 AND 100),
  reason varchar(80) NOT NULL,
  content_type varchar(30),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reputation_events_user_created_idx
  ON reputation_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_daily_usage (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  active_seconds integer NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS screen_time_sessions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  usage_date date NOT NULL,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_id, usage_date)
);

CREATE INDEX IF NOT EXISTS screen_time_sessions_date_idx
  ON screen_time_sessions (usage_date);

