BEGIN;

-- A canonical row per direct-message pair makes duplicate conversations
-- impossible even when both users start the chat at the same time.
CREATE TABLE IF NOT EXISTS direct_conversation_pairs (
  user_low uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_low, user_high),
  CHECK (user_low < user_high)
);

CREATE INDEX IF NOT EXISTS profiles_username_search_idx ON user_profiles (lower(username));
CREATE INDEX IF NOT EXISTS follows_follower_created_idx ON follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_public_profile_idx
  ON posts (author_id, published_at DESC, id)
  WHERE deleted_at IS NULL AND moderation_status = 'safe';

COMMIT;
