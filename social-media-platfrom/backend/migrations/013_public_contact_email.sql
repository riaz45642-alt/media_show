-- Authentication email remains in users.email. This separate, nullable field
-- is public only when a user explicitly supplies it in profile settings.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS contact_email citext;

COMMENT ON COLUMN user_profiles.contact_email IS
  'Optional user-supplied public contact address; never copied from users.email.';
