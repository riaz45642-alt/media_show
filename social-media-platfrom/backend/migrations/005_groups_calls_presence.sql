BEGIN;

-- ============================================================
-- Presence (online/offline)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status varchar(12) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  socket_count integer NOT NULL DEFAULT 0 CHECK (socket_count >= 0),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Groups (built on top of the existing conversations/messages
-- tables so group chat reuses proven infra: one conversation per
-- group with kind='group', conversation_members mirrors group
-- membership for read receipts / muting / pinning).
-- ============================================================
CREATE TYPE group_privacy AS ENUM ('public', 'private');
CREATE TYPE group_role AS ENUM ('member', 'admin', 'owner');
CREATE TYPE group_join_state AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE group_invite_state AS ENUM ('pending', 'accepted', 'declined', 'expired');

CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid UNIQUE REFERENCES conversations(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name varchar(100) NOT NULL,
  slug citext UNIQUE,
  description varchar(1000),
  category varchar(60) NOT NULL DEFAULT 'general',
  is_educational boolean NOT NULL DEFAULT false,
  privacy group_privacy NOT NULL DEFAULT 'public',
  avatar_media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  cover_media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  avatar_url text,
  cover_url text,
  member_count integer NOT NULL DEFAULT 1 CHECK (member_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE group_members (
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role group_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Kept separate from group_members.role to allow future finer-grained
-- permission sets per group without altering the membership table.
CREATE TABLE group_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{"manage_members":false,"manage_messages":false,"manage_settings":false}'::jsonb,
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status group_join_state NOT NULL DEFAULT 'pending',
  message varchar(500),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status group_invite_state NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (group_id, invited_user_id)
);

-- ============================================================
-- Group chat: reuse `messages` (conversation_id -> groups.conversation_id)
-- for text/image/video/document/replies/timestamps/seen (via
-- conversation_members.last_read_at). Additions below cover what the
-- base chat schema doesn't: pins, per-message read receipts, and
-- typing state is realtime-only (no table needed).
-- ============================================================
CREATE TABLE group_message_media (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  file_url text,
  file_name varchar(255),
  file_type varchar(30) NOT NULL DEFAULT 'document' CHECK (file_type IN ('image', 'video', 'document', 'audio')),
  file_size bigint,
  PRIMARY KEY (message_id)
);

CREATE TABLE group_pinned_messages (
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, message_id)
);

CREATE TABLE group_message_receipts (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE group_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind varchar(40) NOT NULL,
  title varchar(160) NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Educational-group extras: assignments & announcements. Notes/PDFs
-- reuse group_message_media (file_type='document') tagged with kind
-- below via a lightweight extension table.
CREATE TABLE group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  due_at timestamptz,
  attachment_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE group_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Calls (1:1 voice/video, WebRTC + Socket.IO signaling)
-- ============================================================
CREATE TYPE call_kind AS ENUM ('voice', 'video');
CREATE TYPE call_status AS ENUM ('ringing', 'accepted', 'declined', 'missed', 'ended', 'failed');
CREATE TYPE call_participant_status AS ENUM ('invited', 'joined', 'left', 'declined');

CREATE TABLE calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind call_kind NOT NULL DEFAULT 'voice',
  status call_status NOT NULL DEFAULT 'ringing',
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  end_reason varchar(30),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calls_distinct_parties CHECK (caller_id <> callee_id)
);

-- One row per active/attempted call, holds the current signaling
-- room id so reconnects can rejoin the same session.
CREATE TABLE call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
  room_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE call_participants (
  call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status call_participant_status NOT NULL DEFAULT 'invited',
  joined_at timestamptz,
  left_at timestamptz,
  muted boolean NOT NULL DEFAULT false,
  camera_off boolean NOT NULL DEFAULT false,
  PRIMARY KEY (call_id, user_id)
);

CREATE TABLE call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event varchar(40) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX groups_category_idx ON groups (category) WHERE deleted_at IS NULL;
CREATE INDEX groups_privacy_idx ON groups (privacy) WHERE deleted_at IS NULL;
CREATE INDEX groups_name_search_idx ON groups (lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX group_members_user_idx ON group_members (user_id);
CREATE INDEX group_join_requests_group_idx ON group_join_requests (group_id, status, created_at DESC);
CREATE INDEX group_invitations_user_idx ON group_invitations (invited_user_id, status);
CREATE INDEX group_notifications_recipient_idx ON group_notifications (recipient_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX group_assignments_group_idx ON group_assignments (group_id, due_at);
CREATE INDEX group_announcements_group_idx ON group_announcements (group_id, created_at DESC);

CREATE INDEX calls_caller_idx ON calls (caller_id, created_at DESC);
CREATE INDEX calls_callee_idx ON calls (callee_id, created_at DESC);
CREATE INDEX calls_active_idx ON calls (status) WHERE status IN ('ringing', 'accepted');
CREATE INDEX call_participants_user_idx ON call_participants (user_id);
CREATE INDEX call_logs_call_idx ON call_logs (call_id, created_at);

COMMIT;
