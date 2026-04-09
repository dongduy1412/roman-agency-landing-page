import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { AppEnv, Testimonial } from '../types'

export const adminTestimonialRoutes = new Hono<AppEnv>()

adminTestimonialRoutes.use('*', requireAuth)

// ── GET /api/admin/testimonials ─────────────────────────
adminTestimonialRoutes.get('/testimonials', async (c) => {
  const lang = c.req.query('lang')
  let query = `SELECT * FROM testimonials`
  const bindings: string[] = []

  if (lang) {
    query += ` WHERE lang = ?`
    bindings.push(lang)
  }

  query += ` ORDER BY lang, sort_order ASC`

  const { results } = bindings.length
    ? await c.env.DB.prepare(query).bind(...bindings).all<Testimonial>()
    : await c.env.DB.prepare(query).all<Testimonial>()

  return c.json({ success: true, data: results, meta: { total: results.length } })
})

// ── GET /api/admin/testimonials/:id ─────────────────────
adminTestimonialRoutes.get('/testimonials/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const item = await c.env.DB.prepare(`SELECT * FROM testimonials WHERE id = ?`).bind(id).first<Testimonial>()

  if (!item) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Testimonial not found', status: 404 } }, 404)
  }

  return c.json({ success: true, data: item })
})

// ── POST /api/admin/testimonials ────────────────────────
adminTestimonialRoutes.post('/testimonials', async (c) => {
  let body: { author_name: string; author_role?: string; content: string; lang?: string; sort_order?: number }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON', status: 400 } }, 400)
  }

  const { author_name, author_role = '', content, lang = 'en', sort_order } = body

  if (!author_name?.trim() || !content?.trim()) {
    return c.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'author_name and content are required', status: 400 } }, 400)
  }

  let order = sort_order
  if (order === undefined) {
    const maxOrder = await c.env.DB.prepare(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM testimonials WHERE lang = ?`
    ).bind(lang).first<{ next: number }>()
    order = maxOrder?.next ?? 1
  }

  const { meta } = await c.env.DB.prepare(
    `INSERT INTO testimonials (author_name, author_role, content, lang, sort_order) VALUES (?, ?, ?, ?, ?)`
  ).bind(author_name.trim(), author_role.trim(), content.trim(), lang, order).run()

  const newItem = await c.env.DB.prepare(`SELECT * FROM testimonials WHERE id = ?`).bind(meta.last_row_id).first<Testimonial>()

  return c.json({ success: true, data: newItem }, 201)
})

// ── PATCH /api/admin/testimonials/:id ───────────────────
adminTestimonialRoutes.patch('/testimonials/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  let body: Partial<{ author_name: string; author_role: string; content: string; sort_order: number; is_active: number }>

  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON', status: 400 } }, 400)
  }

  const existing = await c.env.DB.prepare(`SELECT id FROM testimonials WHERE id = ?`).bind(id).first()
  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Testimonial not found', status: 404 } }, 404)
  }

  const fields: string[] = []
  const values: unknown[] = []

  if (body.author_name !== undefined) { fields.push('author_name = ?'); values.push(body.author_name.trim()) }
  if (body.author_role !== undefined) { fields.push('author_role = ?'); values.push(body.author_role.trim()) }
  if (body.content !== undefined) { fields.push('content = ?'); values.push(body.content.trim()) }
  if (body.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(body.sort_order) }
  if (body.is_active !== undefined) { fields.push('is_active = ?'); values.push(body.is_active ? 1 : 0) }

  if (!fields.length) {
    return c.json({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update', status: 400 } }, 400)
  }

  fields.push('updated_at = datetime(\'now\')')
  values.push(id)

  await c.env.DB.prepare(`UPDATE testimonials SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()

  const updated = await c.env.DB.prepare(`SELECT * FROM testimonials WHERE id = ?`).bind(id).first<Testimonial>()

  return c.json({ success: true, data: updated })
})

// ── DELETE /api/admin/testimonials/:id ──────────────────
adminTestimonialRoutes.delete('/testimonials/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const existing = await c.env.DB.prepare(`SELECT id FROM testimonials WHERE id = ?`).bind(id).first()

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Testimonial not found', status: 404 } }, 404)
  }

  await c.env.DB.prepare(`DELETE FROM testimonials WHERE id = ?`).bind(id).run()

  return c.json({ success: true, data: { message: 'Testimonial deleted', id } })
})
