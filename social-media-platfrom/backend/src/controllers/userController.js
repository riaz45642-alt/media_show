import { pool } from '../config/db.js'
import { moderate } from '../services/moderationService.js'
import { validateDisplayName } from '../services/ruleBasedFilter.js'
import { createNotification } from '../services/notificationService.js'
import { permanentlyDeleteAccount } from '../services/accountDeletionService.js'
import fs from 'node:fs/promises'
import { moderateUploadedMedia } from '../services/mediaModerationService.js'
import { deletePublicMedia, objectPathFromPublicUrl, uploadPublicMedia } from '../services/objectStorageService.js'

let profileSchemaReady
async function ensureProfileSchema() {
  if (!profileSchemaReady) {
    profileSchemaReady = pool.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS contact_email citext`)
      .catch((error) => {
        profileSchemaReady = null
        const schemaError = new Error('Profile database schema is not ready. Apply migration 013_public_contact_email.sql.')
        schemaError.status = 503
        schemaError.code = 'PROFILE_SCHEMA_OUTDATED'
        schemaError.expose = true
        schemaError.cause = error
        throw schemaError
      })
  }
  await profileSchemaReady
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export async function searchUsers(req, res, next) {
  try {
    const search = String(req.query.search || '').trim()
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 20))
    const { rows } = await pool.query(
      `SELECT u.id, p.display_name AS name, p.username, avatar.storage_path AS avatar_url,
              EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followed_id = u.id) AS is_following
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN media_assets avatar ON avatar.id = p.avatar_media_id AND avatar.deleted_at IS NULL
       WHERE u.id <> $1 AND u.status = 'active' AND u.deleted_at IS NULL
         AND ($2 = '' OR p.display_name ILIKE '%' || $2 || '%' OR p.username ILIKE '%' || $2 || '%')
       ORDER BY is_following DESC,
                CASE WHEN lower(p.username) = lower($2) THEN 0 WHEN p.username ILIKE $2 || '%' THEN 1 WHEN p.display_name ILIKE $2 || '%' THEN 2 ELSE 3 END,
                p.display_name
       LIMIT $3`,
      [req.user.id, search, limit]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function getUserProfile(req, res, next) {
  try {
    await ensureProfileSchema()
    const { rows } = await pool.query(
      `SELECT u.id, p.display_name AS name, p.username,
              CASE WHEN ($2::uuid = u.id OR s.profile_visibility = 'public' OR EXISTS
                (SELECT 1 FROM follows f WHERE f.follower_id = $2::uuid AND f.followed_id = u.id)) THEN p.bio ELSE NULL END AS bio,
              CASE WHEN ($2::uuid = u.id OR s.profile_visibility = 'public' OR EXISTS
                (SELECT 1 FROM follows f WHERE f.follower_id = $2::uuid AND f.followed_id = u.id)) THEN p.contact_email ELSE NULL END AS contact_email,
              CASE WHEN ($2::uuid = u.id OR s.profile_visibility = 'public' OR EXISTS
                (SELECT 1 FROM follows f WHERE f.follower_id = $2::uuid AND f.followed_id = u.id)) THEN p.age_group ELSE NULL END AS age_group,
              avatar.storage_path AS avatar_url,
              (s.profile_visibility <> 'public') AS is_private,
              s.messaging_enabled,
              EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $2 AND f.followed_id = u.id) AS is_following,
              EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = u.id AND f.followed_id = $2) AS follows_viewer,
              EXISTS (SELECT 1 FROM friend_requests fr WHERE fr.sender_id = $2 AND fr.recipient_id = u.id AND fr.status = 'pending') AS follow_pending,
              ($2 = u.id OR s.profile_visibility = 'public' OR EXISTS
                (SELECT 1 FROM follows f WHERE f.follower_id = $2 AND f.followed_id = u.id)) AS can_view_posts,
              ($2 <> u.id AND s.messaging_enabled = true AND viewer_settings.messaging_enabled = true AND (s.profile_visibility = 'public' OR EXISTS
                (SELECT 1 FROM follows f WHERE f.follower_id = $2 AND f.followed_id = u.id))) AS can_message,
              count(DISTINCT f1.follower_id)::int AS follower_count,
              count(DISTINCT f2.followed_id)::int AS following_count,
              count(DISTINCT po.id)::int AS post_count
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       JOIN user_settings s ON s.user_id = u.id
       JOIN user_settings viewer_settings ON viewer_settings.user_id = $2
       LEFT JOIN media_assets avatar ON avatar.id = p.avatar_media_id AND avatar.deleted_at IS NULL
       LEFT JOIN follows f1 ON f1.followed_id = u.id
       LEFT JOIN follows f2 ON f2.follower_id = u.id
       LEFT JOIN posts po ON po.author_id = u.id AND po.deleted_at IS NULL AND po.moderation_status = 'safe'
       WHERE u.id = $1 AND u.status = 'active' AND u.deleted_at IS NULL
       GROUP BY u.id, p.display_name, p.username, p.bio, p.contact_email, p.age_group, avatar.storage_path,
                s.profile_visibility, s.messaging_enabled, viewer_settings.messaging_enabled`,
      [req.params.id, req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'User not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

export async function getUserPosts(req, res, next) {
  try {
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12))
    const cursor = req.query.cursor || null
    const access = await pool.query(
      `SELECT s.profile_visibility,
              EXISTS (SELECT 1 FROM follows WHERE follower_id = $2 AND followed_id = $1) AS follows_target,
              EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND followed_id = $2) AS target_follows
       FROM users u JOIN user_settings s ON s.user_id = u.id
       WHERE u.id = $1 AND u.status = 'active' AND u.deleted_at IS NULL`,
      [req.params.id, req.user.id]
    )
    if (!access.rows[0]) return res.status(404).json({ message: 'User not found' })
    const relation = access.rows[0]
    const own = req.params.id === req.user.id
    if (!own && relation.profile_visibility !== 'public' && !relation.follows_target) {
      return res.status(403).json({ message: 'This account is private.' })
    }
    const allowedVisibilities = own
      ? ['public', 'followers', 'friends', 'private']
      : relation.follows_target && relation.target_follows
        ? ['public', 'followers', 'friends']
        : relation.follows_target ? ['public', 'followers'] : ['public']
    const { rows } = await pool.query(
      `SELECT p.*, p.author_id AS user_id, p.body AS text_content,
              up.display_name AS author, up.username, avatar.storage_path AS avatar_url,
              media.items AS media, media.image_url, media.video_url,
              comments.items AS comments,
              EXISTS (SELECT 1 FROM reactions r WHERE r.post_id = p.id AND r.user_id = $2) AS liked_by_me,
              EXISTS (SELECT 1 FROM saved_collection_posts scp JOIN saved_collections sc ON sc.id = scp.collection_id
                      WHERE scp.post_id = p.id AND sc.owner_id = $2) AS saved_by_me
       FROM posts p
       JOIN user_profiles up ON up.user_id = p.author_id
       LEFT JOIN media_assets avatar ON avatar.id = up.avatar_media_id AND avatar.deleted_at IS NULL
       LEFT JOIN LATERAL (
         SELECT COALESCE(jsonb_agg(jsonb_build_object(
                  'id', ma.id, 'type', ma.kind, 'url', ma.storage_path,
                  'mimeType', ma.mime_type, 'position', pm.position
                ) ORDER BY pm.position), '[]'::jsonb) AS items,
                min(ma.storage_path) FILTER (WHERE ma.kind = 'image') AS image_url,
                min(ma.storage_path) FILTER (WHERE ma.kind = 'video') AS video_url
         FROM post_media pm JOIN media_assets ma ON ma.id = pm.media_id AND ma.deleted_at IS NULL
         WHERE pm.post_id = p.id
       ) media ON true
       LEFT JOIN LATERAL (
         SELECT COALESCE(jsonb_agg(jsonb_build_object(
                  'id', c.id, 'text_content', c.body, 'author', cup.display_name,
                  'user_id', c.author_id, 'created_at', c.created_at,
                  'avatar_url', ca.storage_path
                ) ORDER BY c.created_at), '[]'::jsonb) AS items
         FROM comments c JOIN user_profiles cup ON cup.user_id = c.author_id
         LEFT JOIN media_assets ca ON ca.id = cup.avatar_media_id AND ca.deleted_at IS NULL
         WHERE c.post_id = p.id AND c.deleted_at IS NULL AND c.moderation_status = 'safe'
       ) comments ON true
       WHERE p.author_id = $1 AND p.deleted_at IS NULL AND p.moderation_status = 'safe'
         AND p.visibility = ANY($3::visibility[])
         AND ($4::timestamptz IS NULL OR COALESCE(p.published_at, p.created_at) < $4)
       ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC
       LIMIT $5`,
      [req.params.id, req.user.id, allowedVisibilities, cursor, limit + 1]
    )
    const hasMore = rows.length > limit
    const posts = rows.slice(0, limit)
    const last = posts[posts.length - 1]
    res.json({ posts, hasMore, nextCursor: hasMore ? (last.published_at || last.created_at) : null })
  } catch (error) { next(error) }
}

export async function toggleFollow(req, res, next) {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot follow yourself' })
    const target = await pool.query(
      `SELECT u.id, s.profile_visibility FROM users u JOIN user_settings s ON s.user_id = u.id
       WHERE u.id = $1 AND u.status = 'active' AND u.deleted_at IS NULL`, [req.params.id]
    )
    if (!target.rows[0]) return res.status(404).json({ message: 'User not found' })
    const removed = await pool.query(
      `DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2 RETURNING followed_id`,
      [req.user.id, req.params.id]
    )
    if (removed.rowCount) return res.json({ status: 'none', following: false })
    if (target.rows[0].profile_visibility !== 'public') {
      const request = await pool.query(
        `INSERT INTO friend_requests (sender_id, recipient_id, status) VALUES ($1,$2,'pending')
         ON CONFLICT (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)) WHERE status = 'pending'
         DO UPDATE SET created_at = friend_requests.created_at RETURNING id`,
        [req.user.id, req.params.id]
      )
      await createNotification({
        userId: req.params.id, actorId: req.user.id, category: 'followers', type: 'friend_request',
        text: 'You have a new follow request', link: '/notifications', entityType: 'follow_request', entityId: request.rows[0].id,
      })
      return res.status(202).json({ status: 'pending', following: false })
    }
    await pool.query(`INSERT INTO follows (follower_id, followed_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, req.params.id])
    await createNotification({
      userId: req.params.id, actorId: req.user.id, category: 'followers', type: 'follow',
      text: 'Someone started following you', link: `/users/${req.user.id}`, entityType: 'user', entityId: req.user.id,
    })
    res.json({ status: 'accepted', following: true })
  } catch (error) { next(error) }
}

export async function acceptFollowRequest(req, res, next) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const request = await client.query(
      `UPDATE friend_requests SET status = 'accepted', responded_at = now()
       WHERE id = $1 AND recipient_id = $2 AND status = 'pending' RETURNING sender_id`,
      [req.params.requestId, req.user.id]
    )
    if (!request.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Follow request not found' })
    }
      await client.query(`INSERT INTO follows (follower_id, followed_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [request.rows[0].sender_id, req.user.id])
    await client.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, now()),
           data = COALESCE(data, '{}'::jsonb) || '{"accepted":true,"status":"accepted"}'::jsonb
       WHERE recipient_id = $1::uuid AND entity_type = 'follow_request' AND entity_id = $2::uuid`,
      [req.user.id, req.params.requestId]
    )
    await client.query('COMMIT')
    await createNotification({
      userId: request.rows[0].sender_id, actorId: req.user.id, category: 'followers', type: 'follow',
      text: 'Your follow request was accepted', link: `/users/${req.user.id}`, entityType: 'user', entityId: req.user.id,
    })
    res.json({ status: 'accepted' })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    next(error)
  } finally { client.release() }
}

export async function listConnections(req, res, next) {
  try {
    const targetId = req.params.id === 'me' ? req.user.id : req.params.id
    const viewerId = req.user.id
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(String(targetId))) return res.status(400).json({ message: 'Invalid user ID' })
    if (!uuidPattern.test(String(viewerId))) return res.status(401).json({ message: 'Invalid authenticated user ID' })
    const type = req.query.type === 'following' ? 'following' : 'followers'
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const access = await pool.query(
      `SELECT p.display_name AS name, COALESCE(s.profile_visibility, 'public'::visibility) AS profile_visibility,
              ($1::uuid = $2::uuid OR COALESCE(s.profile_visibility, 'public'::visibility) = 'public' OR EXISTS
                (SELECT 1 FROM follows WHERE follower_id = $2::uuid AND followed_id = $1::uuid)) AS can_view
       FROM users u JOIN user_profiles p ON p.user_id = u.id LEFT JOIN user_settings s ON s.user_id = u.id
       WHERE u.id = $1::uuid AND u.status = 'active' AND u.deleted_at IS NULL`,
      [targetId, viewerId]
    )
    if (!access.rows[0]) return res.status(404).json({ message: 'User not found' })
    if (!access.rows[0].can_view) return res.status(403).json({ message: 'This account is private.' })
    const join = type === 'followers'
      ? 'JOIN user_profiles p ON p.user_id = f.follower_id JOIN users u ON u.id = f.follower_id LEFT JOIN user_settings s ON s.user_id = f.follower_id'
      : 'JOIN user_profiles p ON p.user_id = f.followed_id JOIN users u ON u.id = f.followed_id LEFT JOIN user_settings s ON s.user_id = f.followed_id'
    const condition = type === 'followers' ? 'f.followed_id = $1::uuid' : 'f.follower_id = $1::uuid'
    const idColumn = type === 'followers' ? 'f.follower_id' : 'f.followed_id'
    const { rows } = await pool.query(
      `SELECT ${idColumn} AS id, p.display_name AS name, p.username,
              avatar.storage_path AS avatar_url, (COALESCE(s.profile_visibility, 'public'::visibility) <> 'public') AS is_private,
              EXISTS (SELECT 1 FROM follows mine WHERE mine.follower_id = $2::uuid AND mine.followed_id = ${idColumn}) AS is_following,
              ($2::uuid <> ${idColumn}
                AND COALESCE((to_jsonb(s)->>'messaging_enabled')::boolean, true)
                AND COALESCE((to_jsonb(viewer_settings)->>'messaging_enabled')::boolean, true)
                AND (COALESCE(s.profile_visibility, 'public'::visibility) = 'public' OR EXISTS
                  (SELECT 1 FROM follows approved WHERE approved.follower_id = $2::uuid AND approved.followed_id = ${idColumn}))) AS can_message
       FROM follows f ${join}
       LEFT JOIN user_settings viewer_settings ON viewer_settings.user_id = $2::uuid
       LEFT JOIN media_assets avatar ON avatar.id = p.avatar_media_id AND avatar.deleted_at IS NULL
       WHERE ${condition} AND u.status = 'active' AND u.deleted_at IS NULL
       ORDER BY f.created_at DESC, ${idColumn} DESC LIMIT $3::int OFFSET $4::int`,
      [targetId, viewerId, limit + 1, offset]
    )
    const hasMore = rows.length > limit
    res.json({ name: access.rows[0].name, users: rows.slice(0, limit), hasMore, nextOffset: hasMore ? offset + limit : null })
  } catch (error) {
    console.error('listConnections failed:', {
      targetId: req.params.id,
      viewerId: req.user?.id,
      type: req.query.type,
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    })
    next(error)
  }
}

export async function getMe(req, res, next) {
  try {
    await ensureProfileSchema()
    const { rows } = await pool.query(
      `SELECT u.id, p.display_name AS name, p.date_of_birth, p.age_group,
              p.username, p.bio, p.contact_email, p.safe_zone_score, u.role, u.status,
              avatar.storage_path AS avatar_url,
              (s.profile_visibility <> 'public') AS is_private, s.messaging_enabled,
              (SELECT count(*)::int FROM follows WHERE followed_id = u.id) AS follower_count,
              (SELECT count(*)::int FROM follows WHERE follower_id = u.id) AS following_count,
              (SELECT count(*)::int FROM posts WHERE author_id = u.id AND deleted_at IS NULL AND moderation_status = 'safe') AS post_count
       FROM users u JOIN user_profiles p ON p.user_id = u.id JOIN user_settings s ON s.user_id = u.id
       LEFT JOIN media_assets avatar ON avatar.id = p.avatar_media_id AND avatar.deleted_at IS NULL
       WHERE u.id = $1`,
      [req.user.id]
    )
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

export async function updateMe(req, res, next) {
  try {
    await ensureProfileSchema()
    const { isPrivate } = req.body
    const currentResult = await pool.query(
      `SELECT user_id AS id, display_name AS name, username, date_of_birth, age_group, bio, contact_email
       FROM user_profiles WHERE user_id = $1::uuid`, [req.user.id]
    )
    const current = currentResult.rows[0]
    if (!current) return res.status(404).json({ message: 'Profile not found.' })
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : null
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : null
    const contactEmail = typeof req.body.contactEmail === 'string' ? req.body.contactEmail.trim().toLowerCase() : null
    const normalizedUsername = typeof req.body.username === 'string' && req.body.username.trim()
      ? req.body.username.trim().toLowerCase()
      : null
    const nameChanged = name !== null && name !== current.name
    const usernameChanged = normalizedUsername !== null && normalizedUsername.toLowerCase() !== String(current.username).toLowerCase()
    const bioChanged = bio !== null && bio !== (current.bio || '')
    const contactEmailChanged = contactEmail !== null && contactEmail !== (current.contact_email || '')

    if (nameChanged) {
      const check = validateDisplayName(name)
      if (!check.valid) {
        return res.status(422).json({ message: 'Display name not allowed', flags: check.flags, suggestions: check.suggestions })
      }
    }

    let moderation = null
    if (bioChanged && bio) {
      moderation = await moderate({ text: bio, userId: req.user.id, contentType: 'bio' })
      if (moderation.status === 'rejected') {
        return res.status(422).json({ message: 'Bio rejected by moderation', reason: moderation.reason })
      }
    }

    if (normalizedUsername && !/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) return res.status(400).json({ message: 'Username must be 3–30 letters, numbers, or underscores.' })
    if (usernameChanged) {
      const duplicate = await pool.query(
        `SELECT user_id FROM user_profiles WHERE username = $1::citext AND user_id <> $2::uuid LIMIT 1`,
        [normalizedUsername, req.user.id]
      )
      if (duplicate.rowCount) return res.status(409).json({ message: 'That username is already taken.', code: 'USERNAME_TAKEN' })
    }
    const { rows } = await pool.query(
      `UPDATE user_profiles SET display_name = COALESCE($1, display_name),
         username = COALESCE($2, username), bio = COALESCE($3, bio),
         contact_email = CASE WHEN $4::boolean THEN NULLIF($5::citext, '') ELSE contact_email END,
         updated_at = now()
       WHERE user_id = $6
       RETURNING user_id AS id, display_name AS name, username, date_of_birth, age_group, bio, contact_email`,
      [nameChanged ? name : null, usernameChanged ? normalizedUsername : null, bioChanged ? bio : null,
        contactEmailChanged, contactEmail, req.user.id]
    )
    if (typeof isPrivate === 'boolean') {
      await pool.query(
        `UPDATE user_settings SET profile_visibility = $1::visibility, updated_at = now() WHERE user_id = $2`,
        [isPrivate ? 'private' : 'public', req.user.id]
      )
    }
    if (rows[0]) rows[0].is_private = typeof isPrivate === 'boolean' ? isPrivate : undefined
    res.json({ user: rows[0], moderation })
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'user_profiles_username_key') {
      return res.status(409).json({ message: 'That username is already taken.', code: 'USERNAME_TAKEN' })
    }
    console.error('updateMe failed:', { userId: req.user?.id, code: err.code, constraint: err.constraint, detail: err.detail, stack: err.stack })
    next(err)
  }
}

export async function deleteMe(req, res, next) {
  try {
    const result = await permanentlyDeleteAccount(req.user.id)
    if (!result.found) return res.status(404).json({ message: 'Account not found.', code: 'ACCOUNT_NOT_FOUND' })
    console.info(JSON.stringify({
      level: 'info', event: 'account_permanently_deleted', userId: req.user.id,
      storageCleanupFailures: result.storageCleanupFailures.length,
    }))
    res.status(200).json({
      message: 'Your account has been permanently deleted.',
      storageCleanupPending: result.storageCleanupFailures.length > 0,
    })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', event: 'account_deletion_failed', userId: req.user?.id,
      code: error.code, message: error.message, detail: error.detail, stack: error.stack,
    }))
    next(error)
  }
}

export async function updateMyAvatar(req, res, next) {
  const file = req.file
  if (!file) return res.status(400).json({ message: 'Profile image is required.', code: 'AVATAR_REQUIRED' })
  try {
    console.info(JSON.stringify({
      level: 'info', event: 'avatar_upload_started', requestId: req.requestId, userId: req.user.id,
      fileName: file.originalname, mimeType: file.mimetype, byteSize: file.size,
    }))
    const [decision] = await moderateUploadedMedia([file])
    if (!decision.available) {
      await fs.unlink(file.path).catch(() => {})
      return res.status(503).json({ message: 'Media moderation is temporarily unavailable. Please try again later.', code: decision.reason })
    }
    if (!decision.safe) {
      await fs.unlink(file.path).catch(() => {})
      return res.status(422).json({ message: 'Profile image rejected.', reason: decision.reason, categories: decision.categories })
    }
    console.info(JSON.stringify({ level: 'info', event: 'avatar_storage_upload_started', requestId: req.requestId, userId: req.user.id }))
    const stored = await uploadPublicMedia(file, `avatars/${req.user.id}`)
    console.info(JSON.stringify({
      level: 'info', event: 'avatar_storage_upload_completed', requestId: req.requestId, userId: req.user.id,
      bucket: stored.bucket, objectPath: stored.objectPath,
    }))
    const client = await pool.connect()
    let oldMedia
    try {
      await client.query('BEGIN')
      oldMedia = (await client.query(
        `SELECT ma.id, ma.storage_bucket, ma.storage_path FROM user_profiles p
         LEFT JOIN media_assets ma ON ma.id = p.avatar_media_id
         WHERE p.user_id = $1::uuid
         FOR UPDATE OF p`, [req.user.id]
      )).rows[0]
      const media = (await client.query(
        `INSERT INTO media_assets (owner_id, kind, storage_bucket, storage_path, mime_type, byte_size, moderation_status)
         VALUES ($1::uuid,'image',$2,$3,$4,$5,'safe') RETURNING id`,
        [req.user.id, stored.bucket, stored.publicUrl, file.mimetype, file.size]
      )).rows[0]
      await client.query(`UPDATE user_profiles SET avatar_media_id = $1::uuid, updated_at = now() WHERE user_id = $2::uuid`, [media.id, req.user.id])
      if (oldMedia?.id) {
        await client.query(`UPDATE media_assets SET deleted_at = now() WHERE id = $1::uuid`, [oldMedia.id])
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      await deletePublicMedia(stored).catch(() => {})
      throw error
    } finally { client.release() }

    if (oldMedia?.storage_path) {
      const oldPath = objectPathFromPublicUrl(oldMedia.storage_path, oldMedia.storage_bucket)
      if (oldPath) await deletePublicMedia({ bucket: oldMedia.storage_bucket, objectPath: oldPath }).catch((error) => {
        console.error(JSON.stringify({ level: 'error', event: 'old_avatar_storage_delete_failed', userId: req.user.id, code: error.code, message: error.message }))
      })
    }
    console.info(JSON.stringify({
      level: 'info', event: 'avatar_profile_updated', requestId: req.requestId, userId: req.user.id,
      avatarUrl: stored.publicUrl,
    }))
    res.status(200).json({ avatar_url: stored.publicUrl })
  } catch (error) {
    await fs.unlink(file.path).catch(() => {})
    console.error(JSON.stringify({
      level: 'error', event: 'avatar_upload_failed', requestId: req.requestId, userId: req.user?.id,
      error: { name: error.name, code: error.code, message: error.message, detail: error.detail, stack: error.stack },
    }))
    next(error)
  }
}

// GET /api/users/:id/reputation  (or /api/users/me/reputation)
// Computes real Trust/Reputation/Safety/Community scores from DB signals,
// in the same shape utils/reputation.js's computeReputation() returns —
// so the frontend TrustBadge can render either the live or mock signals.
export async function getReputation(req, res, next) {
  try {
    const userId = req.params.id === 'me' ? req.user.id : req.params.id

    const { rows: userRows } = await pool.query(
      `SELECT p.warnings_count, p.reputation_score, u.status,
              COALESCE((SELECT max(risk_score) FROM moderation_cases
                        WHERE target_type = 'user' AND target_id = u.id), 0) AS risk_score
       FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [userId]
    )
    if (!userRows[0]) return res.status(404).json({ message: 'User not found' })
    const user = userRows[0]

    const { rows: postStats } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE moderation_status = 'safe') AS approved,
         COUNT(*) FILTER (WHERE moderation_status = 'rejected') AS rejected,
         COUNT(*) FILTER (WHERE moderation_status = 'flagged') AS flagged,
         COUNT(*) AS total,
         COALESCE(SUM(like_count), 0) AS total_likes
       FROM posts WHERE author_id = $1`,
      [userId]
    )
    const stats = postStats[0]
    const total = Number(stats.total) || 0
    const approved = Number(stats.approved) || 0
    const rejected = Number(stats.rejected) || 0

    const { rows: reportRows } = await pool.query(
      `SELECT COUNT(*) AS c FROM reports WHERE target_type = 'user' AND target_id = $1`,
      [userId]
    )
    const reportsAgainst = Number(reportRows[0].c) || 0

    const { rows: appealRows } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'approved') AS won FROM appeals WHERE user_id = $1`,
      [userId]
    )
    const appealsWon = Number(appealRows[0].won) || 0

    const safety = clamp(100 - user.warnings_count * 8 - (user.risk_score || 0) * 0.5 - reportsAgainst * 5)
    const moderation = total > 0 ? clamp((approved / total) * 100) : 90
    const community = clamp(50 + Math.min(40, Number(stats.total_likes) * 0.5) + Math.min(10, appealsWon * 2))
    const activity = clamp(Math.min(100, total * 4))

    const trustScore = Number(user.reputation_score)

    const TIERS = [
      { min: 180, key: 'platinum', label: 'Platinum', description: 'Exceptional positive participation and a consistently clean safety record.' },
      { min: 140, key: 'gold', label: 'Gold', description: 'Strong positive engagement with responsible platform activity.' },
      { min: 100, key: 'silver', label: 'Silver', description: 'A solid reputation maintained through safe and constructive participation.' },
      { min: 0, key: 'bronze', label: 'Bronze', description: 'Build your reputation by sharing safe content and engaging positively.' },
    ]
    const tier = TIERS.find((t) => trustScore >= t.min) || TIERS[TIERS.length - 1]
    const badges = [{ key: tier.key, label: tier.label }]

    res.json({
      trustScore,
      safetyScore: safety,
      reputationScore: community,
      communityScore: Math.round((community + moderation) / 2),
      tier,
      badges,
      breakdown: { safety, community, moderation, activity },
      stats: { totalPosts: total, approved, rejected, reportsAgainst, appealsWon },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/users/me/moderation-history
// Combined feed of the current user's posts + comments with moderation
// status, plus warnings and linked appeals — for the Moderation History page.
export async function getModerationHistory(req, res, next) {
  try {
    const { rows: posts } = await pool.query(
      `SELECT p.id, 'post' AS content_type, p.body AS preview, p.moderation_status, p.risk_score,
              p.moderation_reason, p.created_at, mc.reviewed_at
       FROM posts p LEFT JOIN moderation_cases mc ON mc.target_type = 'post' AND mc.target_id = p.id
       WHERE p.author_id = $1 ORDER BY p.created_at DESC LIMIT 100`,
      [req.user.id]
    )
    const { rows: comments } = await pool.query(
      `SELECT c.id, 'comment' AS content_type, c.body AS preview, c.moderation_status, c.risk_score,
              c.moderation_reason, c.created_at, mc.reviewed_at
       FROM comments c LEFT JOIN moderation_cases mc ON mc.target_type = 'comment' AND mc.target_id = c.id
       WHERE c.author_id = $1 ORDER BY c.created_at DESC LIMIT 100`,
      [req.user.id]
    )
    const { rows: appeals } = await pool.query(
      `SELECT id, content_type, content_id, status, created_at, reviewed_at FROM appeals
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    )
    const { rows: userRows } = await pool.query(`SELECT warnings_count FROM user_profiles WHERE user_id = $1`, [req.user.id])

    const items = [...posts, ...comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    res.json({ items, appeals, warningsCount: userRows[0]?.warnings_count || 0 })
  } catch (err) {
    next(err)
  }
}
