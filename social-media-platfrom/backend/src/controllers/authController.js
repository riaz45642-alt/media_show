import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { generateToken } from '../utils/generateToken.js'

function ageGroupFor(age) {
  if (age < 13) return 'kids'
  if (age < 18) return 'teen'
  return 'adult'
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, age, avatarUrl } = req.body
    const passwordHash = await bcrypt.hash(password, 10)
    const ageGroup = ageGroupFor(Number(age))

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, age, age_group, avatar_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, age, age_group, avatar_url`,
      [name, email.toLowerCase(), passwordHash, age, ageGroup, avatarUrl || null]
    )
    const user = rows[0]
    const token = generateToken({ id: user.id })
    res.status(201).json({ user, token })
  } catch (err) {
    // Postgres unique_violation — surface a clear message instead of a 500.
    if (err.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists' })
    }
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const user = rows[0]
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })

    const token = generateToken({ id: user.id })
    delete user.password_hash
    res.json({ user, token })
  } catch (err) {
    next(err)
  }
}
