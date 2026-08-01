BEGIN;

-- Existing data is preserved. These indexes support paginated relationship
-- lists and bidirectional call-history lookups.
CREATE INDEX IF NOT EXISTS follows_follower_created_id_idx
  ON follows (follower_id, created_at DESC, followed_id DESC);
CREATE INDEX IF NOT EXISTS follows_followed_created_id_idx
  ON follows (followed_id, created_at DESC, follower_id DESC);
CREATE INDEX IF NOT EXISTS calls_caller_created_idx
  ON calls (caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS calls_callee_created_idx
  ON calls (callee_id, created_at DESC);

COMMIT;
