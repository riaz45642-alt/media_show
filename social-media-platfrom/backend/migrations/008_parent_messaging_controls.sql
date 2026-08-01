BEGIN;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS messaging_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS parent_password_hash text;

CREATE INDEX IF NOT EXISTS user_settings_messaging_disabled_idx
  ON user_settings (user_id) WHERE messaging_enabled = false;

COMMIT;
