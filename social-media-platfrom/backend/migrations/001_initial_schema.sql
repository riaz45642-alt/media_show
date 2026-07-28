BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE account_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'restricted', 'suspended', 'deleted');
CREATE TYPE visibility AS ENUM ('public', 'followers', 'friends', 'private');
CREATE TYPE moderation_state AS ENUM ('pending', 'safe', 'flagged', 'rejected', 'removed');
CREATE TYPE media_kind AS ENUM ('image', 'video', 'audio');
CREATE TYPE relationship_state AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
CREATE TYPE conversation_kind AS ENUM ('direct', 'group');
CREATE TYPE member_role AS ENUM ('member', 'admin', 'owner');
CREATE TYPE message_kind AS ENUM ('text', 'image', 'video', 'audio', 'shared', 'system');
CREATE TYPE report_state AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE verification_state AS ENUM ('pending', 'verified', 'failed', 'expired', 'revoked');
CREATE TYPE notification_kind AS ENUM (
  'like', 'reaction', 'comment', 'mention', 'follow', 'friend_request',
  'message', 'moderation', 'appeal', 'report', 'verification', 'security', 'system'
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text,
  role account_role NOT NULL DEFAULT 'user',
  status account_status NOT NULL DEFAULT 'active',
  email_verified_at timestamptz,
  last_login_at timestamptz,
  token_version integer NOT NULL DEFAULT 0 CHECK (token_version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT users_auth_method CHECK (password_hash IS NOT NULL OR email_verified_at IS NOT NULL)
);

CREATE TABLE auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('password', 'google', 'firebase')),
  provider_subject text NOT NULL,
  provider_email citext,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE (provider, provider_subject),
  UNIQUE (user_id, provider)
);

CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username citext NOT NULL UNIQUE,
  display_name varchar(120) NOT NULL,
  date_of_birth date,
  age_group varchar(20) NOT NULL DEFAULT 'adult' CHECK (age_group IN ('kids', 'teen', 'adult')),
  gender varchar(30),
  bio varchar(500),
  avatar_media_id uuid,
  cover_media_id uuid,
  parent_email citext,
  locale varchar(12) NOT NULL DEFAULT 'en',
  timezone varchar(64) NOT NULL DEFAULT 'UTC',
  safe_zone_score smallint NOT NULL DEFAULT 80 CHECK (safe_zone_score BETWEEN 0 AND 100),
  warnings_count integer NOT NULL DEFAULT 0 CHECK (warnings_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme varchar(16) NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  profile_visibility visibility NOT NULL DEFAULT 'public',
  allow_messages_from varchar(20) NOT NULL DEFAULT 'followers'
    CHECK (allow_messages_from IN ('everyone', 'followers', 'friends', 'nobody')),
  allow_mentions_from varchar(20) NOT NULL DEFAULT 'everyone'
    CHECK (allow_mentions_from IN ('everyone', 'followers', 'friends', 'nobody')),
  show_activity_status boolean NOT NULL DEFAULT true,
  content_filter_level varchar(16) NOT NULL DEFAULT 'standard'
    CHECK (content_filter_level IN ('strict', 'standard', 'relaxed')),
  notification_preferences jsonb NOT NULL DEFAULT
    '{"likes":true,"comments":true,"mentions":true,"followers":true,"messages":true,"moderation":true,"security":true,"system":true}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind media_kind NOT NULL,
  storage_bucket varchar(100) NOT NULL,
  storage_path text NOT NULL,
  mime_type varchar(120) NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 524288000),
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  alt_text varchar(500),
  checksum_sha256 char(64),
  moderation_status moderation_state NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (storage_bucket, storage_path)
);

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_avatar_fk FOREIGN KEY (avatar_media_id) REFERENCES media_assets(id) ON DELETE SET NULL,
  ADD CONSTRAINT user_profiles_cover_fk FOREIGN KEY (cover_media_id) REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE TABLE verification_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status verification_state NOT NULL DEFAULT 'pending',
  provider varchar(40) NOT NULL DEFAULT 'liveness',
  attempt_count smallint NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  risk_score smallint CHECK (risk_score BETWEEN 0 AND 100),
  failure_reason text,
  verified_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_verification_status (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status verification_state NOT NULL DEFAULT 'pending',
  verified_session_id uuid REFERENCES verification_sessions(id) ON DELETE SET NULL,
  verified_at timestamptz,
  reverify_after timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  body text,
  visibility visibility NOT NULL DEFAULT 'public',
  moderation_status moderation_state NOT NULL DEFAULT 'pending',
  moderation_reason text,
  risk_score smallint NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  comments_enabled boolean NOT NULL DEFAULT true,
  like_count integer NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  comment_count integer NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  share_count integer NOT NULL DEFAULT 0 CHECK (share_count >= 0),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT posts_have_content CHECK (body IS NOT NULL OR parent_post_id IS NOT NULL)
);

CREATE TABLE post_media (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 19),
  PRIMARY KEY (post_id, media_id),
  UNIQUE (post_id, position)
);

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 5000),
  moderation_status moderation_state NOT NULL DEFAULT 'pending',
  moderation_reason text,
  risk_score smallint NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  like_count integer NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE reactions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reaction varchar(20) NOT NULL DEFAULT 'like'
    CHECK (reaction IN ('like', 'love', 'support', 'celebrate', 'insightful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE comment_reactions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reaction varchar(20) NOT NULL DEFAULT 'like'
    CHECK (reaction IN ('like', 'love', 'support', 'celebrate', 'insightful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption varchar(1000),
  visibility visibility NOT NULL DEFAULT 'followers',
  moderation_status moderation_state NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  deleted_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE TABLE story_media (
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 9),
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms BETWEEN 1000 AND 60000),
  PRIMARY KEY (story_id, media_id),
  UNIQUE (story_id, position)
);

CREATE TABLE story_views (
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE follows (
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

CREATE TABLE friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status relationship_state NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);

CREATE UNIQUE INDEX friend_requests_pending_pair_uq
  ON friend_requests (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id))
  WHERE status = 'pending';

CREATE TABLE user_blocks (
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE user_mutes (
  muter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind conversation_kind NOT NULL DEFAULT 'direct',
  title varchar(120),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  last_read_at timestamptz,
  muted_until timestamptz,
  pinned_at timestamptz,
  archived_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  kind message_kind NOT NULL DEFAULT 'text',
  body text,
  moderation_status moderation_state NOT NULL DEFAULT 'pending',
  moderation_reason text,
  risk_score smallint NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  sent_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT messages_have_content CHECK (body IS NOT NULL OR kind <> 'text')
);

CREATE TABLE message_media (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  PRIMARY KEY (message_id, media_id)
);

CREATE TABLE saved_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, name)
);

CREATE TABLE saved_collection_posts (
  collection_id uuid NOT NULL REFERENCES saved_collections(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, post_id)
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind notification_kind NOT NULL,
  entity_type varchar(40),
  entity_id uuid,
  title varchar(160) NOT NULL,
  body text,
  link text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_type varchar(30) NOT NULL CHECK (target_type IN ('user', 'post', 'comment', 'story', 'message')),
  target_id uuid NOT NULL,
  reason varchar(120) NOT NULL,
  details text,
  status report_state NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);

CREATE TABLE moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type varchar(30) NOT NULL CHECK (target_type IN ('user', 'post', 'comment', 'story', 'message', 'media')),
  target_id uuid NOT NULL,
  source varchar(20) NOT NULL CHECK (source IN ('automated', 'report', 'moderator')),
  status moderation_state NOT NULL DEFAULT 'pending',
  risk_score smallint NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  reason text,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES moderation_cases(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(30) NOT NULL CHECK (action IN ('approve', 'reject', 'remove', 'restore', 'warn', 'restrict', 'suspend', 'ban')),
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id uuid REFERENCES moderation_cases(id) ON DELETE SET NULL,
  target_type varchar(30) NOT NULL,
  target_id uuid NOT NULL,
  explanation text NOT NULL CHECK (length(btrim(explanation)) BETWEEN 10 AND 5000),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  moderator_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE TABLE activity_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type varchar(80) NOT NULL,
  entity_type varchar(40),
  entity_id uuid,
  ip_hash char(64),
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_email citext NOT NULL,
  template_key varchar(80) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'cancelled')),
  provider_message_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX users_status_idx ON users (status) WHERE deleted_at IS NULL;
CREATE INDEX auth_identities_user_idx ON auth_identities (user_id);
CREATE INDEX profiles_display_name_idx ON user_profiles (lower(display_name));
CREATE INDEX media_owner_created_idx ON media_assets (owner_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX verification_user_created_idx ON verification_sessions (user_id, created_at DESC);
CREATE INDEX posts_feed_idx ON posts (published_at DESC, id) WHERE deleted_at IS NULL AND moderation_status = 'safe';
CREATE INDEX posts_author_idx ON posts (author_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX comments_post_idx ON comments (post_id, created_at, id) WHERE deleted_at IS NULL;
CREATE INDEX comments_author_idx ON comments (author_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX reactions_post_idx ON reactions (post_id);
CREATE INDEX stories_active_idx ON stories (author_id, expires_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX follows_followed_idx ON follows (followed_id, created_at DESC);
CREATE INDEX friend_requests_recipient_idx ON friend_requests (recipient_id, status, created_at DESC);
CREATE INDEX conversation_members_user_idx ON conversation_members (user_id, archived_at, pinned_at DESC);
CREATE INDEX messages_conversation_idx ON messages (conversation_id, sent_at DESC, id) WHERE deleted_at IS NULL;
CREATE INDEX notifications_unread_idx ON notifications (recipient_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX reports_queue_idx ON reports (status, created_at);
CREATE INDEX moderation_queue_idx ON moderation_cases (status, risk_score DESC, created_at);
CREATE INDEX activity_user_created_idx ON activity_logs (user_id, created_at DESC);
CREATE INDEX activity_created_brin_idx ON activity_logs USING brin (created_at);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER verification_sessions_updated_at BEFORE UPDATE ON verification_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER verification_status_updated_at BEFORE UPDATE ON user_verification_status FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER collections_updated_at BEFORE UPDATE ON saved_collections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON moderation_cases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER appeals_updated_at BEFORE UPDATE ON appeals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
