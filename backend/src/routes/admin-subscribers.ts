import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

export const adminSubscriberRoutes = new Hono<AppEnv>()

adminSubscriberRoutes.use('*', requireAuth)

// ── GET /api/admin/subscribers ───────────────────────────
adminSubscriberRoutes.get('/subscribers', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = (page - 1) * limit

  const { results } = await c.env.DB.prepare(
    `SELECT id, email, created_at, origin FROM subscribers ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all()

  const total = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM subscribers`).first<{ count: number }>()

  return c.json({
    success: true,
    data: results,
    meta: { total: total?.count ?? 0, page, limit },
  })
})

// ── DELETE /api/admin/subscribers/:id ───────────────────
adminSubscriberRoutes.delete('/subscribers/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const existing = await c.env.DB.prepare(`SELECT id FROM subscribers WHERE id = ?`).bind(id).first()

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Subscriber not found', status: 404 } }, 404)
  }

  await c.env.DB.prepare(`DELETE FROM subscribers WHERE id = ?`).bind(id).run()

  return c.json({ success: true, data: { message: 'Subscriber removed', id } })
})

// ── GET /api/admin/subscribers/export ───────────────────
// Export as CSV
adminSubscriberRoutes.get('/subscribers/export', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT email, created_at, origin FROM subscribers ORDER BY created_at DESC`
  ).all<{ email: string; created_at: string; origin: string | null }>()

  const csv = [
    'email,subscribed_at,source',
    ...results.map(r => `${r.email},${r.created_at},${r.origin || ''}`)
  ].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="subscribers-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
})
