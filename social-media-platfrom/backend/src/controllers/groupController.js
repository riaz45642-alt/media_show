import { pool } from '../config/db.js'
import { createNotification } from '../services/notificationService.js'
import { getIO } from '../sockets/index.js'
import { emitToCurrentGroupMembers } from '../services/groupRealtimeService.js'

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 7)
}

async function getRole(groupId, userId) {
  const { rows } = await pool.query(`SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`, [groupId, userId])
  return rows[0]?.role || null
}

async function notifyGroup(groupId, kind, title, body, link, excludeUserId) {
  const { rows } = await pool.query(`SELECT user_id FROM group_members WHERE group_id = $1 AND user_id <> $2`, [groupId, excludeUserId])
  for (const { user_id } of rows) {
    await pool.query(
      `INSERT INTO group_notifications (group_id, recipient_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5,$6)`,
      [groupId, user_id, kind, title, body, link]
    )
  }
  try { await emitToCurrentGroupMembers(groupId, 'group:notification', { groupId, kind, title, body }, excludeUserId) }
  catch { /* socket layer not ready yet, ignore */ }
}

export async function createGroup(req, res, next) {
  try {
    const { name, description, category = 'general', isEducational = false, avatarUrl, coverUrl } = req.body
    const privacy = 'private'
    if (!name?.trim()) return res.status(400).json({ message: 'Group name is required' })

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows: convRows } = await client.query(
        `INSERT INTO conversations (kind, title, created_by) VALUES ('group', $1, $2) RETURNING id`,
        [name, req.user.id]
      )
      const conversationId = convRows[0].id

      const { rows: groupRows } = await client.query(
        `INSERT INTO groups (conversation_id, owner_id, name, slug, description, category, is_educational, privacy, avatar_url, cover_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [conversationId, req.user.id, name.trim(), slugify(name), description || null, category, !!isEducational, privacy, avatarUrl || null, coverUrl || null]
      )
      const group = groupRows[0]

      await client.query(`INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,'owner')`, [group.id, req.user.id])
      await client.query(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1,$2,'owner')`, [conversationId, req.user.id])

      await client.query('COMMIT')
      res.status(201).json(group)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    next(err)
  }
}

export async function updateGroup(req, res, next) {
  try {
    const role = await getRole(req.params.groupId, req.user.id)
    if (!['owner', 'admin'].includes(role)) return res.status(403).json({ message: 'Only group admins can edit this group' })

    const fields = ['name', 'description', 'category', 'privacy', 'avatarUrl', 'coverUrl', 'isEducational']
    const columnMap = { avatarUrl: 'avatar_url', coverUrl: 'cover_url', isEducational: 'is_educational' }
    const sets = []
    const values = []
    let i = 1
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        sets.push(`${columnMap[f] || f} = $${i++}`)
        values.push(req.body[f])
      }
    }
    if (!sets.length) return res.status(400).json({ message: 'No fields to update' })
    values.push(req.params.groupId)
    const { rows } = await pool.query(
      `UPDATE groups SET ${sets.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
      values
    )
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

export async function deleteGroup(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT owner_id FROM groups WHERE id = $1`, [req.params.groupId])
    if (!rows.length) return res.status(404).json({ message: 'Group not found' })
    if (rows[0].owner_id !== req.user.id) return res.status(403).json({ message: 'Only the owner can delete this group' })
    await pool.query(`UPDATE groups SET deleted_at = now() WHERE id = $1`, [req.params.groupId])
    res.json({ message: 'Group deleted' })
  } catch (err) {
    next(err)
  }
}

export async function getGroup(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT g.*, gm.role AS my_role
       FROM groups g JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $2::uuid
       WHERE g.id = $1::uuid AND g.deleted_at IS NULL`,
      [req.params.groupId, req.user.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Group not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

export async function listGroups(req, res, next) {
  try {
    const { search, category } = req.query
    const clauses = ['g.deleted_at IS NULL', 'gm.user_id = $1::uuid']
    const values = [req.user.id]
    let i = 2
    if (search) { clauses.push(`lower(g.name) LIKE $${i}`); values.push(`%${search.toLowerCase()}%`); i++ }
    if (category) { clauses.push(`g.category = $${i}`); values.push(category); i++ }

    const { rows } = await pool.query(
      `SELECT g.*, gm.role AS my_role
       FROM groups g JOIN group_members gm ON gm.group_id = g.id
       WHERE ${clauses.join(' AND ')} ORDER BY g.member_count DESC LIMIT 50`,
      values
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

// Suggested groups: public groups the user isn't in yet, biased toward
// their existing categories, falling back to most popular.
export async function suggestedGroups(_req, res, next) {
  try {
    res.json([])
  } catch (err) {
    next(err)
  }
}

export async function listMembers(req, res, next) {
  try {
    if (!await getRole(req.params.groupId, req.user.id)) return res.status(403).json({ message: 'You are not a member of this group' })
    const { rows } = await pool.query(
      `SELECT gm.user_id, gm.role, gm.joined_at, up.display_name, up.avatar_media_id,
              avatar.storage_path AS avatar_url
       FROM group_members gm JOIN user_profiles up ON up.user_id = gm.user_id
       LEFT JOIN media_assets avatar ON avatar.id = up.avatar_media_id AND avatar.deleted_at IS NULL
       WHERE gm.group_id = $1 ORDER BY gm.role, gm.joined_at`,
      [req.params.groupId]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function addMembers(req, res, next) {
  try {
    const groupId = req.params.groupId
    const userIds = [...new Set(req.body.userIds || [])]
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!userIds.every((id) => typeof id === 'string' && uuidPattern.test(id))) {
      return res.status(400).json({ message: 'Every selected user must have a valid ID' })
    }
    const role = await getRole(groupId, req.user.id)
    if (!['owner', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'Only group admins can add members' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows: groupRows } = await client.query(
        `SELECT conversation_id FROM groups WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [groupId]
      )
      if (!groupRows.length) {
        const error = new Error('Group not found')
        error.status = 404
        throw error
      }
      const { rows: validUsers } = await client.query(
        `SELECT id FROM users
         WHERE id = ANY($1::uuid[]) AND status = 'active' AND deleted_at IS NULL`,
        [userIds]
      )
      if (!validUsers.length) {
        const error = new Error('No valid users were selected')
        error.status = 400
        throw error
      }
      const validIds = validUsers.map(({ id }) => id)
      const { rows: added } = await client.query(
        `INSERT INTO group_members (group_id, user_id, role)
         SELECT $1, user_id, 'member' FROM unnest($2::uuid[]) AS user_id
         ON CONFLICT (group_id, user_id) DO NOTHING
         RETURNING user_id`,
        [groupId, validIds]
      )
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         SELECT $1, user_id, 'member' FROM unnest($2::uuid[]) AS user_id
         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [groupRows[0].conversation_id, validIds]
      )
      await client.query(
        `UPDATE groups SET member_count = (
           SELECT count(*) FROM group_members WHERE group_id = $1
         ) WHERE id = $1`,
        [groupId]
      )
      await client.query('COMMIT')
      res.status(201).json({ addedUserIds: added.map(({ user_id }) => user_id), addedCount: added.length })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    next(err)
  }
}

export async function joinOrRequest(req, res, next) {
  try {
    const groupId = req.params.groupId
    const existing = await getRole(groupId, req.user.id)
    if (existing) return res.status(409).json({ message: 'Already a member' })
    res.status(403).json({ message: 'This group is invite-only. Ask an owner or admin to add you.' })
  } catch (err) {
    next(err)
  }
}

export async function listJoinRequests(req, res, next) {
  try {
    const role = await getRole(req.params.groupId, req.user.id)
    if (!['owner', 'admin'].includes(role)) return res.status(403).json({ message: 'Not authorized' })
    const { rows } = await pool.query(
      `SELECT jr.*, up.display_name FROM group_join_requests jr
       JOIN user_profiles up ON up.user_id = jr.user_id
       WHERE jr.group_id = $1 AND jr.status = 'pending' ORDER BY jr.created_at`,
      [req.params.groupId]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function reviewJoinRequest(req, res, next) {
  try {
    const { groupId, requestId } = req.params
    const { approve } = req.body
    const role = await getRole(groupId, req.user.id)
    if (!['owner', 'admin'].includes(role)) return res.status(403).json({ message: 'Not authorized' })

    const { rows } = await pool.query(
      `UPDATE group_join_requests SET status = $1, reviewed_by = $2, reviewed_at = now()
       WHERE id = $3 AND group_id = $4 AND status = 'pending' RETURNING *`,
      [approve ? 'approved' : 'rejected', req.user.id, requestId, groupId]
    )
    if (!rows.length) return res.status(404).json({ message: 'Request not found' })
    const request = rows[0]

    if (approve) {
      const { rows: g } = await pool.query(`SELECT conversation_id FROM groups WHERE id = $1`, [groupId])
      await pool.query(`INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`, [groupId, request.user_id])
      await pool.query(`INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [g[0].conversation_id, request.user_id])
      await pool.query(`UPDATE groups SET member_count = member_count + 1 WHERE id = $1`, [groupId])
    }
    await createNotification({
      userId: request.user_id,
      category: 'system',
      type: 'system',
      text: approve ? 'Your request to join the group was approved' : 'Your request to join the group was declined',
      link: `/groups/${groupId}`,
    })
    res.json({ message: 'Reviewed', request })
  } catch (err) {
    next(err)
  }
}

export async function inviteMember(req, res, next) {
  try {
    const groupId = req.params.groupId
    const { userId } = req.body
    const role = await getRole(groupId, req.user.id)
    if (!['owner', 'admin'].includes(role)) return res.status(403).json({ message: 'Only group owners and admins can invite members' })

    const { rows } = await pool.query(
      `INSERT INTO group_invitations (group_id, invited_user_id, invited_by) VALUES ($1,$2,$3)
       ON CONFLICT (group_id, invited_user_id) DO UPDATE SET status = 'pending', created_at = now() RETURNING *`,
      [groupId, userId, req.user.id]
    )
    await createNotification({ userId, category: 'system', type: 'system', text: 'You were invited to join a group', link: `/groups/${groupId}` })
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
}

export async function respondToInvitation(req, res, next) {
  try {
    const { invitationId } = req.params
    const { accept } = req.body
    const { rows } = await pool.query(
      `UPDATE group_invitations SET status = $1, responded_at = now()
       WHERE id = $2 AND invited_user_id = $3 AND status = 'pending' RETURNING *`,
      [accept ? 'accepted' : 'declined', invitationId, req.user.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Invitation not found' })
    const invite = rows[0]
    if (accept) {
      const { rows: g } = await pool.query(`SELECT conversation_id FROM groups WHERE id = $1`, [invite.group_id])
      await pool.query(`INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`, [invite.group_id, req.user.id])
      await pool.query(`INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [g[0].conversation_id, req.user.id])
      await pool.query(`UPDATE groups SET member_count = member_count + 1 WHERE id = $1`, [invite.group_id])
    }
    res.json({ message: accept ? 'Joined group' : 'Invitation declined' })
  } catch (err) {
    next(err)
  }
}

export async function removeMember(req, res, next) {
  try {
    const { groupId, userId } = req.params
    const role = await getRole(groupId, req.user.id)
    if (!['owner', 'admin'].includes(role)) return res.status(403).json({ message: 'Not authorized' })
    const targetRole = await getRole(groupId, userId)
    if (targetRole === 'owner') return res.status(400).json({ message: 'Cannot remove the group owner' })

    const { rows: g } = await pool.query(`SELECT conversation_id FROM groups WHERE id = $1`, [groupId])
    await pool.query(`DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`, [groupId, userId])
    await pool.query(`DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`, [g[0].conversation_id, userId])
    await pool.query(`UPDATE groups SET member_count = GREATEST(0, member_count - 1) WHERE id = $1`, [groupId])
    getIO().in(`user:${userId}`).socketsLeave(`group:${groupId}`)
    res.json({ message: 'Member removed' })
  } catch (err) {
    next(err)
  }
}

export async function setMemberRole(req, res, next) {
  try {
    const { groupId, userId } = req.params
    const { role: newRole } = req.body // 'admin' | 'member'
    const requesterRole = await getRole(groupId, req.user.id)
    if (requesterRole !== 'owner') return res.status(403).json({ message: 'Only the owner can promote or demote admins' })
    if (!['admin', 'member'].includes(newRole)) return res.status(400).json({ message: 'Invalid role' })

    await pool.query(`UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3 AND role <> 'owner'`, [newRole, groupId, userId])
    res.json({ message: 'Role updated' })
  } catch (err) {
    next(err)
  }
}

export async function transferOwnership(req, res, next) {
  try {
    const { groupId } = req.params
    const { userId: newOwnerId } = req.body
    const { rows } = await pool.query(`SELECT owner_id FROM groups WHERE id = $1`, [groupId])
    if (!rows.length) return res.status(404).json({ message: 'Group not found' })
    if (rows[0].owner_id !== req.user.id) return res.status(403).json({ message: 'Only the current owner can transfer ownership' })
    if (!(await getRole(groupId, newOwnerId))) return res.status(400).json({ message: 'Target user is not a member' })

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`UPDATE groups SET owner_id = $1 WHERE id = $2`, [newOwnerId, groupId])
      await client.query(`UPDATE group_members SET role = 'admin' WHERE group_id = $1 AND user_id = $2`, [groupId, req.user.id])
      await client.query(`UPDATE group_members SET role = 'owner' WHERE group_id = $1 AND user_id = $2`, [groupId, newOwnerId])
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
    res.json({ message: 'Ownership transferred' })
  } catch (err) {
    next(err)
  }
}

export async function leaveGroup(req, res, next) {
  try {
    const groupId = req.params.groupId
    const role = await getRole(groupId, req.user.id)
    if (!role) return res.status(404).json({ message: 'Not a member' })
    if (role === 'owner') return res.status(400).json({ message: 'Transfer ownership before leaving the group' })

    const { rows: g } = await pool.query(`SELECT conversation_id FROM groups WHERE id = $1`, [groupId])
    await pool.query(`DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`, [groupId, req.user.id])
    await pool.query(`DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`, [g[0].conversation_id, req.user.id])
    await pool.query(`UPDATE groups SET member_count = GREATEST(0, member_count - 1) WHERE id = $1`, [groupId])
    getIO().in(`user:${req.user.id}`).socketsLeave(`group:${groupId}`)
    res.json({ message: 'Left group' })
  } catch (err) {
    next(err)
  }
}

export async function createAnnouncement(req, res, next) {
  try {
    const role = await getRole(req.params.groupId, req.user.id)
    if (!['owner', 'admin'].includes(role)) return res.status(403).json({ message: 'Not authorized' })
    const { title, body } = req.body
    if (!title || !body) return res.status(400).json({ message: 'Title and body are required' })
    const { rows } = await pool.query(
      `INSERT INTO group_announcements (group_id, created_by, title, body) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.groupId, req.user.id, title, body]
    )
    await notifyGroup(req.params.groupId, 'announcement', title, body, `/groups/${req.params.groupId}`, req.user.id)
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
}

export async function listAnnouncements(req, res, next) {
  try {
    if (!await getRole(req.params.groupId, req.user.id)) return res.status(403).json({ message: 'You are not a member of this group' })
    const { rows } = await pool.query(`SELECT * FROM group_announcements WHERE group_id = $1 ORDER BY created_at DESC`, [req.params.groupId])
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

export async function createAssignment(req, res, next) {
  try {
    const role = await getRole(req.params.groupId, req.user.id)
    if (!['owner', 'admin'].includes(role)) return res.status(403).json({ message: 'Not authorized' })
    const { title, description, dueAt } = req.body
    if (!title) return res.status(400).json({ message: 'Title is required' })
    const { rows } = await pool.query(
      `INSERT INTO group_assignments (group_id, created_by, title, description, due_at) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.groupId, req.user.id, title, description || null, dueAt || null]
    )
    await notifyGroup(req.params.groupId, 'assignment', title, description, `/groups/${req.params.groupId}`, req.user.id)
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
}

export async function listAssignments(req, res, next) {
  try {
    if (!await getRole(req.params.groupId, req.user.id)) return res.status(403).json({ message: 'You are not a member of this group' })
    const { rows } = await pool.query(`SELECT * FROM group_assignments WHERE group_id = $1 ORDER BY due_at NULLS LAST, created_at DESC`, [req.params.groupId])
    res.json(rows)
  } catch (err) {
    next(err)
  }
}
