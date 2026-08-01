import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { generateToken } from '../utils/generateToken.js'
import { validateDisplayName } from '../services/ruleBasedFilter.js'
import { firebaseAdminAuth, firebaseRevocationChecksEnabled } from '../services/firebaseAdmin.js'

function ageGroupFor(age) {
  if (age < 13) return 'kids'
  if (age < 18) return 'teen'
  return 'adult'
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, age } = req.body
    const usernameCheck = validateDisplayName(name)
    if (!usernameCheck.valid) {
      return res.status(422).json({
        message: 'That name is not allowed',
        flags: usernameCheck.flags,
        suggestions: usernameCheck.suggestions,
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const ageGroup = ageGroupFor(Number(age))
    const usernameBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'member'
    const username = `${usernameBase}_${crypto.randomUUID().slice(0, 6)}`
    const birthDate = new Date()
    birthDate.setUTCFullYear(birthDate.getUTCFullYear() - Number(age))

    const client = await pool.connect()
    let user
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2)
         RETURNING id, email, role, status, created_at`,
        [email.toLowerCase(), passwordHash]
      )
      user = rows[0]
      await client.query(
        `INSERT INTO user_profiles (user_id, username, display_name, date_of_birth, age_group)
         VALUES ($1,$2,$3,$4,$5)`,
        [user.id, username, name, birthDate.toISOString().slice(0, 10), ageGroup]
      )
      await client.query('INSERT INTO user_settings (user_id) VALUES ($1)', [user.id])
      await client.query(
        `INSERT INTO auth_identities (user_id, provider, provider_subject, provider_email)
         VALUES ($1, 'password', $2, $3)`,
        [user.id, email.toLowerCase(), email.toLowerCase()]
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    user = { ...user, name, username, age: Number(age), age_group: ageGroup }
    res.status(201).json({ user, token: generateToken({ id: user.id }) })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists' })
    }
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const { rows } = await pool.query(
      `SELECT u.*, p.display_name AS name, p.username, p.date_of_birth, p.age_group,
              p.bio, p.safe_zone_score, (s.profile_visibility <> 'public') AS is_private
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       JOIN user_settings s ON s.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [email.toLowerCase()]
    )
    const user = rows[0]
    if (!user || user.status !== 'active') return res.status(401).json({ message: 'Invalid credentials' })
    if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    delete user.password_hash
    user.age = user.date_of_birth
      ? Math.floor((Date.now() - new Date(user.date_of_birth).getTime()) / 31557600000)
      : null
    await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id])
    res.json({ user, token: generateToken({ id: user.id }) })
  } catch (error) {
    next(error)
  }
}

export async function firebaseLogin(req, res, next) {
  try {
    const decoded = await firebaseAdminAuth.verifyIdToken(req.body.idToken, firebaseRevocationChecksEnabled)
    if (!decoded.email || decoded.email_verified !== true) {
      return res.status(401).json({ message: 'Google did not provide a verified email address.' })
    }

    const email = decoded.email.toLowerCase()
    const name = String(decoded.name || email.split('@')[0] || 'Member').trim().slice(0, 120)
    const usernameBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'member'
    const client = await pool.connect()
    let userId

    try {
      await client.query('BEGIN')
      const linkedIdentity = await client.query(
        `SELECT u.id, u.status, u.deleted_at
         FROM auth_identities i
         JOIN users u ON u.id = i.user_id
         WHERE i.provider = 'google' AND i.provider_subject = $1
         FOR UPDATE OF i, u`,
        [decoded.uid]
      )

      if (linkedIdentity.rows[0]) {
        const linkedUser = linkedIdentity.rows[0]
        if (linkedUser.deleted_at || linkedUser.status !== 'active') {
          const error = new Error('This account is not currently active.')
          error.status = 403
          throw error
        }
        userId = linkedUser.id
      } else {
        const account = await client.query(
          `INSERT INTO users (email, email_verified_at, last_login_at)
           VALUES ($1, now(), now())
           ON CONFLICT (email) DO UPDATE SET
             email_verified_at = COALESCE(users.email_verified_at, now()),
             last_login_at = now()
           RETURNING id, status, deleted_at`,
          [email]
        )
        const databaseUser = account.rows[0]
        if (databaseUser.deleted_at || databaseUser.status !== 'active') {
          const error = new Error('This account is not currently active.')
          error.status = 403
          throw error
        }
        userId = databaseUser.id
      }

      const identity = await client.query(
        `INSERT INTO auth_identities
           (user_id, provider, provider_subject, provider_email, metadata, last_used_at)
         VALUES ($1, 'google', $2, $3, $4::jsonb, now())
         ON CONFLICT (provider, provider_subject) DO UPDATE SET
           provider_email = EXCLUDED.provider_email,
           metadata = EXCLUDED.metadata,
           last_used_at = now()
         WHERE auth_identities.user_id = EXCLUDED.user_id
         RETURNING user_id`,
        [userId, decoded.uid, email, JSON.stringify({ picture: decoded.picture || null })]
      )
      if (!identity.rowCount) {
        const error = new Error('This Google account is already linked to another user.')
        error.status = 409
        throw error
      }

      const username = `${usernameBase}_${crypto.randomUUID().slice(0, 6)}`
      await client.query(
        `INSERT INTO user_profiles (user_id, username, display_name, age_group)
         VALUES ($1, $2, $3, 'adult')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, username, name]
      )
      await client.query(
        `INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      )
      await client.query(
        `UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), last_login_at = now()
         WHERE id = $1`,
        [userId]
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.role, u.status, u.created_at,
              p.display_name AS name, p.username, p.date_of_birth, p.age_group,
              p.bio, p.safe_zone_score, $2::text AS avatar,
              (s.profile_visibility <> 'public') AS is_private
       FROM users u JOIN user_profiles p ON p.user_id = u.id JOIN user_settings s ON s.user_id = u.id
       WHERE u.id = $1`,
      [userId, decoded.picture || null]
    )
    if (!rows[0]) {
      const error = new Error('Authenticated user profile could not be loaded.')
      error.status = 500
      throw error
    }
    res.status(200).json({ user: rows[0], token: generateToken({ id: userId }) })
  } catch (error) {
    if (error.code?.startsWith('auth/')) {
      return res.status(401).json({ message: 'Google sign-in token is invalid or expired.' })
    }
    next(error)
  }
}
