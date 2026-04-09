import { Hono } from 'hono'
import type { AppEnv } from '../types'

export const subscriberRoutes = new Hono<AppEnv>()

// ── POST /api/subscribe ──────────────────────────────────
subscriberRoutes.post('/subscribe', async (c) => {
  let body: { email?: string }

  try {
    body = await c.req.json()
  } catch {
    return c.json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Invalid JSON body', status: 400 },
    }, 400)
  }

  const email = body.email?.trim().toLowerCase()

  if (!email) {
    return c.json({
      success: false,
      error: { code: 'MISSING_EMAIL', message: 'Email is required', status: 400 },
    }, 400)
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!isValidEmail) {
    return c.json({
      success: false,
      error: { code: 'INVALID_EMAIL', message: 'Invalid email format', status: 400 },
    }, 400)
  }

  // Check if already subscribed
  const existing = await c.env.DB.prepare(
    `SELECT id FROM subscribers WHERE email = ?`
  ).bind(email).first()

  if (existing) {
    return c.json({
      success: true,
      data: { message: 'Email already subscribed' },
    })
  }

  // Insert new subscriber
  await c.env.DB.prepare(
    `INSERT INTO subscribers (email, origin, user_agent) VALUES (?, ?, ?)`
  ).bind(
    email,
    c.req.header('origin') ?? null,
    c.req.header('user-agent') ?? null,
  ).run()

  return c.json({
    success: true,
    data: { message: 'Subscribed successfully' },
  }, 201)
})
