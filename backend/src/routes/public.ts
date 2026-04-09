import { Hono } from 'hono'
import type { AppEnv } from '../types'

export const publicRoutes = new Hono<AppEnv>()

// ── GET /api/faqs ────────────────────────────────────────
publicRoutes.get('/faqs', async (c) => {
  const lang = c.req.query('lang') || 'en'

  const { results } = await c.env.DB.prepare(
    `SELECT id, question, answer, sort_order, lang
     FROM faqs
     WHERE lang = ? AND is_active = 1
     ORDER BY sort_order ASC`
  ).bind(lang).all()

  return c.json({ success: true, data: results, meta: { lang, total: results.length } })
})

// ── GET /api/media ───────────────────────────────────────
publicRoutes.get('/media', async (c) => {
  const section = c.req.query('section')

  let query = `SELECT * FROM media_items WHERE is_visible = 1`
  const bindings: string[] = []

  if (section) {
    query += ` AND section = ?`
    bindings.push(section)
  }

  query += ` ORDER BY section, sort_order ASC`

  const { results } = bindings.length
    ? await c.env.DB.prepare(query).bind(...bindings).all()
    : await c.env.DB.prepare(query).all()

  return c.json({ success: true, data: results, meta: { total: results.length } })
})

// ── GET /api/settings ────────────────────────────────────
publicRoutes.get('/settings', async (c) => {
  const lang = c.req.query('lang') || 'en'

  const { results } = await c.env.DB.prepare(
    `SELECT key, value FROM settings WHERE lang = ?`
  ).bind(lang).all()

  // Convert to key-value map
  const data = Object.fromEntries(results.map((r: any) => [r.key, r.value]))

  return c.json({ success: true, data, meta: { lang } })
})

// ── GET /api/published-config ─────────────────────────────
publicRoutes.get('/public-media/:section/:file', async (c) => {
  const section = c.req.param('section')
  const file = c.req.param('file')
  const key = `media/${section}/${file}`

  const object = await c.env.MEDIA.get(key)
  if (!object) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Media file not found', status: 404 } }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
})

publicRoutes.get('/published-config', async (c) => {
  const current = await c.env.DB.prepare(
    `SELECT value FROM publish_state WHERE key = 'current_release_id'`
  ).first<{ value: string }>()

  if (!current) {
    return c.json({
      success: false,
      error: { code: 'NO_PUBLISHED_RELEASE', message: 'No published config available yet', status: 404 },
    }, 404)
  }

  const release = await c.env.DB.prepare(
    `SELECT version, config_json, created_at FROM publish_releases WHERE id = ?`
  ).bind(current.value).first<{ version: number; config_json: string; created_at: string }>()

  if (!release) {
    return c.json({
      success: false,
      error: { code: 'NO_PUBLISHED_RELEASE', message: 'Published release not found', status: 404 },
    }, 404)
  }

  return c.json({
    success: true,
    data: JSON.parse(release.config_json),
    meta: { version: release.version, created_at: release.created_at },
  })
})
