BEGIN;

-- The Express API normally connects with a server-only role. These policies
-- also make direct Supabase client access safe if it is enabled later.
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_collection_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_verified()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_verification_status
    WHERE user_id = auth.uid()
      AND status = 'verified'
      AND revoked_at IS NULL
      AND (reverify_after IS NULL OR reverify_after > now())
  );
$$;

CREATE POLICY profiles_public_read ON user_profiles FOR SELECT USING (true);
CREATE POLICY profiles_owner_update ON user_profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY settings_owner_all ON user_settings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY verification_owner_read ON user_verification_status FOR SELECT USING (user_id = auth.uid());

CREATE POLICY media_owner_read ON media_assets FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY media_verified_insert ON media_assets FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND public.current_user_verified());
CREATE POLICY media_owner_update ON media_assets FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY posts_visible_read ON posts FOR SELECT USING (
  deleted_at IS NULL AND (
    author_id = auth.uid() OR
    (moderation_status = 'safe' AND visibility = 'public') OR
    (moderation_status = 'safe' AND visibility = 'followers' AND EXISTS (
      SELECT 1 FROM follows WHERE follower_id = auth.uid() AND followed_id = posts.author_id
    ))
  )
);
CREATE POLICY posts_verified_insert ON posts FOR INSERT
  WITH CHECK (author_id = auth.uid() AND public.current_user_verified());
CREATE POLICY posts_owner_update ON posts FOR UPDATE USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY posts_owner_delete ON posts FOR DELETE USING (author_id = auth.uid());

CREATE POLICY comments_visible_read ON comments FOR SELECT USING (deleted_at IS NULL AND moderation_status = 'safe');
CREATE POLICY comments_verified_insert ON comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND public.current_user_verified());
CREATE POLICY comments_owner_update ON comments FOR UPDATE USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY comments_owner_delete ON comments FOR DELETE USING (author_id = auth.uid());

CREATE POLICY reactions_read ON reactions FOR SELECT USING (true);
CREATE POLICY reactions_verified_write ON reactions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.current_user_verified());
CREATE POLICY reactions_owner_delete ON reactions FOR DELETE USING (user_id = auth.uid());

CREATE POLICY stories_visible_read ON stories FOR SELECT USING (
  deleted_at IS NULL AND expires_at > now() AND
  (author_id = auth.uid() OR moderation_status = 'safe')
);
CREATE POLICY stories_verified_insert ON stories FOR INSERT
  WITH CHECK (author_id = auth.uid() AND public.current_user_verified());
CREATE POLICY story_views_owner_insert ON story_views FOR INSERT WITH CHECK (viewer_id = auth.uid());

CREATE POLICY follows_read ON follows FOR SELECT USING (true);
CREATE POLICY follows_verified_write ON follows FOR INSERT
  WITH CHECK (follower_id = auth.uid() AND public.current_user_verified());
CREATE POLICY follows_owner_delete ON follows FOR DELETE USING (follower_id = auth.uid());
CREATE POLICY friend_requests_participants ON friend_requests FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY friend_requests_verified_insert ON friend_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND public.current_user_verified());
CREATE POLICY friend_requests_recipient_update ON friend_requests FOR UPDATE
  USING (recipient_id = auth.uid() OR sender_id = auth.uid());

CREATE POLICY conversation_member_read ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = id AND cm.user_id = auth.uid())
);
CREATE POLICY conversation_verified_insert ON conversations FOR INSERT
  WITH CHECK (created_by = auth.uid() AND public.current_user_verified());
CREATE POLICY members_read ON conversation_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_members mine WHERE mine.conversation_id = conversation_id AND mine.user_id = auth.uid())
);
CREATE POLICY messages_member_read ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid())
);
CREATE POLICY messages_verified_insert ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND public.current_user_verified() AND EXISTS (
    SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY notifications_owner_read ON notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY notifications_owner_update ON notifications FOR UPDATE USING (recipient_id = auth.uid());
CREATE POLICY collections_owner_all ON saved_collections FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY collection_posts_owner_all ON saved_collection_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM saved_collections c WHERE c.id = collection_id AND c.owner_id = auth.uid())
);
CREATE POLICY reports_owner_read ON reports FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY reports_verified_insert ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid() AND public.current_user_verified());
CREATE POLICY appeals_owner_all ON appeals FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMIT;
