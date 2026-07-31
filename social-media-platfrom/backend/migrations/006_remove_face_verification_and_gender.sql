-- Remove the retired face-verification and gender-profile feature from existing databases.
DROP TABLE IF EXISTS user_verification_status;
DROP TABLE IF EXISTS verification_sessions;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS gender;
ALTER TABLE users DROP COLUMN IF EXISTS gender;
ALTER TABLE users DROP COLUMN IF EXISTS face_verified;
ALTER TABLE users DROP COLUMN IF EXISTS face_verified_at;
