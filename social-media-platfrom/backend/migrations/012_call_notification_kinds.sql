-- Call handlers persist these notification types. They must exist in the
-- PostgreSQL enum or createNotification() cannot insert missed/declined calls.
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'incoming_call';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'missed_call';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'call_declined';
