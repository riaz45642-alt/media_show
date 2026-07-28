BEGIN;

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY presence_public_read ON user_presence FOR SELECT USING (true);
CREATE POLICY presence_owner_write ON user_presence FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY groups_public_read ON groups FOR SELECT USING (privacy = 'public' OR EXISTS (
  SELECT 1 FROM group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
));
CREATE POLICY groups_owner_write ON groups FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY group_members_read ON group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
);

CREATE POLICY group_join_requests_owner_read ON group_join_requests FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM group_members gm WHERE gm.group_id = group_join_requests.group_id
      AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')
  )
);

CREATE POLICY group_invitations_recipient_read ON group_invitations FOR SELECT USING (invited_user_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY group_message_media_member_read ON group_message_media FOR SELECT USING (true);
CREATE POLICY group_pinned_member_read ON group_pinned_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_pinned_messages.group_id AND gm.user_id = auth.uid())
);

CREATE POLICY group_notifications_owner_read ON group_notifications FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY calls_party_read ON calls FOR SELECT USING (caller_id = auth.uid() OR callee_id = auth.uid());
CREATE POLICY call_participants_party_read ON call_participants FOR SELECT USING (user_id = auth.uid());

COMMIT;
