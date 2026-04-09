import type { D1Database } from '@cloudflare/workers-types'
import type { MediaItem } from '../types'

type FixedSlotEntry = {
  id: string
  slot: string
  url: string
  alt: string
  caption: string
  caption_sub: string
  mimeType: string
}

type ListEntry = FixedSlotEntry

type PublishedMediaConfig = Record<
  string,
  Record<string, FixedSlotEntry> | { items: ListEntry[] }
>

const LIST_SECTIONS = new Set([
  'resources',
  'proof-campaign',
  'proof-system',
  'proof-bm',
  'proof-sigma',
  'proof-affiliate',
])

export async function buildPublishedMediaConfig(
  db: D1Database,
  options?: { includeHidden?: boolean }
) {
  const includeHidden = options?.includeHidden ?? false

  const query = includeHidden
    ? `SELECT * FROM media_items ORDER BY section, sort_order ASC, created_at ASC`
    : `SELECT * FROM media_items WHERE is_visible = 1 ORDER BY section, sort_order ASC, created_at ASC`

  const { results } = await db.prepare(query).all<MediaItem>()

  const media: PublishedMediaConfig = {}

  for (const item of results) {
    const normalized: FixedSlotEntry = {
      id: item.id,
      slot: item.slot,
      url: item.r2_url,
      alt: item.alt_text || '',
      caption: item.caption || '',
      caption_sub: item.caption_sub || '',
      mimeType: item.mime_type,
    }

    if (LIST_SECTIONS.has(item.section)) {
      if (!media[item.section]) {
        media[item.section] = { items: [] }
      }
      ;(media[item.section] as { items: ListEntry[] }).items.push(normalized)
      continue
    }

    if (!media[item.section]) {
      media[item.section] = {}
    }

    ;(media[item.section] as Record<string, FixedSlotEntry>)[item.slot] = normalized
  }

  const config = {
    generatedAt: new Date().toISOString(),
    media,
  }

  const summary = {
    sections: Object.keys(media).length,
    items: results.length,
  }

  const canonicalJson = stableStringify({ media })
  const hash = await sha256Hex(canonicalJson)

  return {
    config,
    summary,
    hash,
  }
}

export async function getCurrentPublishedRelease(db: D1Database) {
  const current = await db.prepare(`SELECT value FROM publish_state WHERE key = 'current_release_id'`).first<{ value: string }>()

  if (!current) return null

  return db.prepare(
    `SELECT id, version, status, config_json, config_hash, notes, published_by, created_at
     FROM publish_releases WHERE id = ?`
  ).bind(current.value).first<{
    id: number
    version: number
    status: string
    config_json: string
    config_hash: string
    notes: string
    published_by: string | null
    created_at: string
  }>()
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortObject(value))
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }

  return value
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
