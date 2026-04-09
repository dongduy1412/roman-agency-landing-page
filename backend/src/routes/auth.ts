import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { signJwt, verifyPassword, hashPassword } from '../middleware/auth'

export const authRoutes = new Hono<AppEnv>()

// ── POST /api/auth/setup ─────────────────────────────────
// First-time setup: create admin user (only if none exists)
authRoutes.post('/setup', async (c) => {
  let body: { username?: string; password?: string }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON', status: 400 } }, 400)
  }

  const { username, password } = body

  if (!username || !password) {
    return c.json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'Username and password are required', status: 400 },
    }, 400)
  }

  if (password.length < 8) {
    return c.json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters', status: 400 },
    }, 400)
  }

  // Check if any admin exists
  const existing = await c.env.DB.prepare(`SELECT id FROM admin_users LIMIT 1`).first()
  if (existing) {
    return c.json({
      success: false,
      error: { code: 'ALREADY_SETUP', message: 'Admin user already exists. Use login endpoint.', status: 409 },
    }, 409)
  }

  const password_hash = await hashPassword(password)

  await c.env.DB.prepare(
    `INSERT INTO admin_users (username, password_hash) VALUES (?, ?)`
  ).bind(username, password_hash).run()

  return c.json({
    success: true,
    data: { message: 'Admin user created. You can now login.' },
  }, 201)
})

// ── POST /api/auth/login ─────────────────────────────────
authRoutes.post('/login', async (c) => {
  let body: { username?: string; password?: string }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON', status: 400 } }, 400)
  }

  const { username, password } = body

  if (!username || !password) {
    return c.json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'Username and password are required', status: 400 },
    }, 400)
  }

  // Find user
  const user = await c.env.DB.prepare(
    `SELECT id, username, password_hash FROM admin_users WHERE username = ?`
  ).bind(username).first<{ id: number; username: string; password_hash: string }>()

  if (!user) {
    return c.json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password', status: 401 },
    }, 401)
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return c.json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password', status: 401 },
    }, 401)
  }

  // Issue JWT (24h)
  const token = await signJwt(
    { userId: user.id, username: user.username },
    c.env.JWT_SECRET,
    24
  )

  return c.json({
    success: true,
    data: {
      token,
      username: user.username,
      expiresIn: '24h',
    },
  })
})

// ── POST /api/auth/logout ────────────────────────────────
// Stateless JWT — client just discards token
authRoutes.post('/logout', (c) => {
  return c.json({ success: true, data: { message: 'Logged out successfully' } })
})

// ── GET /api/auth/me ─────────────────────────────────────
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token', status: 401 } }, 401)
  }

  const { verifyJwt } = await import('../middleware/auth')
  const payload = await verifyJwt(authHeader.slice(7), c.env.JWT_SECRET)

  if (!payload) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token', status: 401 } }, 401)
  }

  return c.json({ success: true, data: { userId: payload.userId, username: payload.username } })
})
