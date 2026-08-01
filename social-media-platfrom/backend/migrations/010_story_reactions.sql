BEGIN;
CREATE TABLE IF NOT EXISTS story_reactions (
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction varchar(20) NOT NULL DEFAULT 'like' CHECK (reaction IN ('like','love','support','celebrate')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);
CREATE INDEX IF NOT EXISTS story_reactions_user_idx ON story_reactions (user_id, created_at DESC);
COMMIT;
