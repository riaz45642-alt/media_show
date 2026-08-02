BEGIN;

-- Groups are invite/add-only. A public privacy label no longer grants
-- discovery or read access to users who are not actual members.
DROP POLICY IF EXISTS groups_public_read ON groups;
DROP POLICY IF EXISTS groups_member_read ON groups;
CREATE POLICY groups_member_read ON groups FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
  )
);

-- The original policy used USING (true), which exposed group attachments to
-- any authenticated Supabase client. Resolve the message's group and require
-- current membership instead.
DROP POLICY IF EXISTS group_message_media_member_read ON group_message_media;
CREATE POLICY group_message_media_member_read ON group_message_media FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM messages m
    JOIN groups g ON g.conversation_id = m.conversation_id
    JOIN group_members gm ON gm.group_id = g.id
    WHERE m.id = group_message_media.message_id
      AND gm.user_id = auth.uid()
  )
);

COMMIT;
