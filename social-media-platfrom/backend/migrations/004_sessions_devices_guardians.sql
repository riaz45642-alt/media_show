BEGIN;

CREATE TYPE device_kind AS ENUM ('web', 'ios', 'android', 'desktop', 'other');
CREATE TYPE session_revocation_reason AS ENUM (
  'user_logout', 'user_revoked_device', 'password_change', 'admin_action', 'expired', 'suspicious_activity'
);

CREATE TABLE user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_kind device_kind NOT NULL DEFAULT 'other',
  device_name varchar(120),
  push_token text,
  last_ip_hash char(64),
  last_user_agent text,
  is_trusted boolean NOT NULL DEFAULT false,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES user_devices(id) ON DELETE SET NULL,
  refresh_token_hash char(64) NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_reason session_revocation_reason,
  CHECK (expires_at > issued_at)
);

CREATE INDEX user_devices_user_idx ON user_devices (user_id, last_seen_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX user_sessions_user_idx ON user_sessions (user_id, expires_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX user_sessions_device_idx ON user_sessions (device_id);

CREATE TYPE guardian_relationship AS ENUM ('parent', 'guardian', 'teacher');
CREATE TYPE guardian_link_status AS ENUM ('pending', 'active', 'revoked', 'declined');

CREATE TABLE guardian_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dependent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship guardian_relationship NOT NULL DEFAULT 'parent',
  status guardian_link_status NOT NULL DEFAULT 'pending',
  can_view_activity boolean NOT NULL DEFAULT true,
  can_manage_settings boolean NOT NULL DEFAULT true,
  can_manage_messaging boolean NOT NULL DEFAULT true,
  daily_time_limit_minutes smallint CHECK (daily_time_limit_minutes IS NULL OR daily_time_limit_minutes BETWEEN 5 AND 1440),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (guardian_id <> dependent_id),
  UNIQUE (guardian_id, dependent_id)
);

CREATE INDEX guardian_links_dependent_idx ON guardian_links (dependent_id, status);
CREATE INDEX guardian_links_guardian_idx ON guardian_links (guardian_id, status);

CREATE TRIGGER guardian_links_updated_at BEFORE UPDATE ON guardian_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE usage_daily_stats (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  minutes_active integer NOT NULL DEFAULT 0 CHECK (minutes_active >= 0),
  sessions_count integer NOT NULL DEFAULT 0 CHECK (sessions_count >= 0),
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX usage_daily_stats_user_idx ON usage_daily_stats (user_id, usage_date DESC);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY devices_owner_all ON user_devices FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY sessions_owner_read ON user_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY sessions_owner_update ON user_sessions FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY guardian_links_visible ON guardian_links FOR SELECT USING (
  guardian_id = auth.uid() OR dependent_id = auth.uid()
);
CREATE POLICY guardian_links_guardian_insert ON guardian_links FOR INSERT
  WITH CHECK (guardian_id = auth.uid());
CREATE POLICY guardian_links_participant_update ON guardian_links FOR UPDATE
  USING (guardian_id = auth.uid() OR dependent_id = auth.uid());

CREATE POLICY usage_stats_owner_read ON usage_daily_stats FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM guardian_links gl
    WHERE gl.dependent_id = usage_daily_stats.user_id
      AND gl.guardian_id = auth.uid()
      AND gl.status = 'active'
      AND gl.can_view_activity = true
  )
);

COMMIT;