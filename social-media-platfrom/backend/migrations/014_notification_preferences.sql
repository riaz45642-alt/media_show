-- Categories used by the notification service. Existing user overrides are
-- preserved while missing production categories receive enabled defaults.
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'story';

UPDATE user_settings
SET notification_preferences =
  '{"enabled":true,"likes":true,"comments":true,"follows":true,"messages":true,"calls":true,"mentions":true,"stories":true,"system":true}'::jsonb
  || notification_preferences;

ALTER TABLE user_settings
  ALTER COLUMN notification_preferences SET DEFAULT
  '{"enabled":true,"likes":true,"comments":true,"follows":true,"messages":true,"calls":true,"mentions":true,"stories":true,"system":true}'::jsonb;
