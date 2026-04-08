/**
 * Influencer discovery — Apify proxy
 *
 * POST /api/influencers?action=discover
 *   body: { platform: 'instagram'|'facebook'|'tiktok', query: string, limit?: number }
 *   → runs the appropriate Apify actor, upserts creators into `influencers`,
 *     returns the newly inserted/updated rows.
 *
 * Env vars required:
 *   APIFY_TOKEN                  — personal Apify API token
 *   VITE_SUPABASE_URL            — supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY    — service role key (server-only)
 */

import { createClient } from '@supabase/supabase-js'

const APIFY_BASE   = 'https://api.apify.com/v2'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 days

// Actor IDs (owner~actor-name format for the /acts endpoint)
const ACTORS = {
  instagram: 'apify~instagram-hashtag-scraper',      // hashtag → posts → creators
  ig_profile: 'apify~instagram-profile-scraper',     // enrich creators with follower counts
  tiktok:    'clockworks~tiktok-scraper',            // hashtag → videos → creators
  facebook:  'apify~facebook-pages-scraper',         // search term → pages
}

function db() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function apifyToken() {
  const t = process.env.APIFY_TOKEN
  if (!t) throw new Error('APIFY_TOKEN not configured')
  return t
}

// Run an actor synchronously and return its dataset items.
async function runActor(actorId, input) {
  const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken()}`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify actor ${actorId} failed: ${res.status} ${text.slice(0, 300)}`)
  }
  return res.json()
}

// ── Cache helpers ────────────────────────────────────────────────────────────

async function readCache(supabase, platform, query) {
  const { data } = await supabase
    .from('influencer_discovery_cache')
    .select('results, created_at')
    .eq('platform', platform)
    .eq('query', query)
    .maybeSingle()
  if (!data) return null
  const age = Date.now() - new Date(data.created_at).getTime()
  if (age > CACHE_TTL_MS) return null
  return data.results
}

async function writeCache(supabase, platform, query, results) {
  await supabase
    .from('influencer_discovery_cache')
    .upsert({ platform, query, results, created_at: new Date().toISOString() },
            { onConflict: 'platform,query' })
}

// ── Platform-specific discovery ──────────────────────────────────────────────

async function discoverInstagram(query, limit) {
  const tag = query.replace(/^#/, '')

  // Step 1: scrape hashtag posts to extract unique creators
  const posts = await runActor(ACTORS.instagram, {
    hashtags:      [tag],
    resultsLimit:  Math.min(limit * 3, 60),
  })

  const seen = new Map()
  for (const post of posts) {
    const handle = post.ownerUsername ?? post.owner?.username
    if (!handle) continue
    if (seen.has(handle)) continue
    seen.set(handle, {
      instagram_handle: handle,
      display_name:     post.ownerFullName ?? post.owner?.fullName ?? handle,
      ig_profile_url:   `https://instagram.com/${handle}`,
    })
    if (seen.size >= limit) break
  }

  const handles = Array.from(seen.keys())
  if (!handles.length) return []

  // Step 2: enrich with profile data (follower counts, avatar, etc.)
  let enriched = []
  try {
    enriched = await runActor(ACTORS.ig_profile, {
      usernames: handles,
    })
  } catch {
    // If enrichment fails we still return the basic hits
    enriched = []
  }

  const enrichMap = new Map(
    enriched.map(p => [(p.username ?? '').toLowerCase(), p])
  )

  return handles.map(h => {
    const base = seen.get(h)
    const e    = enrichMap.get(h.toLowerCase())
    return {
      ...base,
      display_name:  e?.fullName ?? base.display_name,
      ig_followers:  e?.followersCount ?? null,
      ig_profile_pic: e?.profilePicUrl ?? null,
      niche:         e?.biography ? null : null,
    }
  })
}

async function discoverTikTok(query, limit) {
  const tag = query.replace(/^#/, '')
  const items = await runActor(ACTORS.tiktok, {
    hashtags:                 [tag],
    resultsPerPage:           Math.min(limit * 3, 60),
    shouldDownloadVideos:     false,
    shouldDownloadCovers:     false,
    shouldDownloadSubtitles:  false,
  })

  const seen = new Map()
  for (const v of items) {
    const author = v.authorMeta ?? v.author
    const handle = author?.name ?? author?.uniqueId ?? author?.username
    if (!handle) continue
    if (seen.has(handle)) continue
    seen.set(handle, {
      tiktok_handle:  handle,
      display_name:   author.nickName ?? author.nickname ?? handle,
      tt_followers:   author.fans ?? author.followerCount ?? null,
      tt_profile_url: `https://www.tiktok.com/@${handle}`,
      tt_profile_pic: author.avatar ?? author.avatarLarger ?? null,
    })
    if (seen.size >= limit) break
  }

  return Array.from(seen.values())
}

async function discoverFacebook(query, limit) {
  const pages = await runActor(ACTORS.facebook, {
    searchQueries: [query],
    maxPages:      Math.min(limit, 30),
  })

  const out = []
  for (const p of pages) {
    const handle = p.pageName ?? p.username ?? (p.url ? new URL(p.url).pathname.replace(/\//g, '') : null)
    if (!handle) continue
    out.push({
      facebook_handle: handle,
      display_name:    p.title ?? p.name ?? handle,
      fb_followers:    p.followers ?? p.likes ?? null,
      fb_page_url:     p.url ?? `https://facebook.com/${handle}`,
      fb_profile_pic:  p.profilePictureUrl ?? p.profilePhoto ?? null,
    })
    if (out.length >= limit) break
  }
  return out
}

// ── Upsert results into influencers table ───────────────────────────────────

async function upsertResults(supabase, platform, query, rows) {
  if (!rows.length) return []

  const handleCol = platform === 'instagram' ? 'instagram_handle'
                  : platform === 'tiktok'    ? 'tiktok_handle'
                  :                            'facebook_handle'

  // Fetch existing matches by (lowercased) handle so we can decide insert vs update.
  const handles = rows.map(r => r[handleCol]).filter(Boolean)
  const { data: existing } = await supabase
    .from('influencers')
    .select(`id, ${handleCol}`)
    .in(handleCol, handles)

  const existingMap = new Map(
    (existing ?? []).map(e => [e[handleCol]?.toLowerCase(), e.id])
  )

  const toInsert = []
  const toUpdate = []
  for (const r of rows) {
    const h  = r[handleCol]?.toLowerCase()
    const id = existingMap.get(h)
    const payload = {
      ...r,
      source:          'apify',
      discovery_query: query,
      updated_at:      new Date().toISOString(),
    }
    if (id) toUpdate.push({ id, ...payload })
    else toInsert.push(payload)
  }

  const inserted = []
  if (toInsert.length) {
    const { data, error } = await supabase
      .from('influencers')
      .insert(toInsert)
      .select()
    if (error) throw error
    inserted.push(...(data ?? []))
  }

  const updated = []
  for (const u of toUpdate) {
    const { id, ...rest } = u
    const { data, error } = await supabase
      .from('influencers')
      .update(rest)
      .eq('id', id)
      .select()
      .single()
    if (error) continue
    updated.push(data)
  }

  return [...inserted, ...updated]
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  try {
    const action = req.query.action ?? 'discover'

    if (action !== 'discover') {
      return res.status(400).json({ ok: false, error: `Unknown action: ${action}` })
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'POST required' })
    }

    const { platform, query, limit = 20 } = req.body ?? {}
    if (!platform || !query) {
      return res.status(400).json({ ok: false, error: 'platform and query required' })
    }
    if (!['instagram', 'facebook', 'tiktok'].includes(platform)) {
      return res.status(400).json({ ok: false, error: 'Unsupported platform' })
    }

    const supabase = db()
    const normalised = String(query).trim().toLowerCase()

    // Check cache first
    let rows = await readCache(supabase, platform, normalised)
    let fromCache = !!rows

    if (!rows) {
      if (platform === 'instagram') rows = await discoverInstagram(normalised, limit)
      else if (platform === 'tiktok') rows = await discoverTikTok(normalised, limit)
      else                            rows = await discoverFacebook(normalised, limit)
      await writeCache(supabase, platform, normalised, rows)
    }

    const saved = await upsertResults(supabase, platform, normalised, rows)

    return res.status(200).json({
      ok:        true,
      platform,
      query:     normalised,
      fromCache,
      count:     saved.length,
      results:   saved,
    })
  } catch (err) {
    console.error('[influencers/discover]', err)
    return res.status(500).json({ ok: false, error: err.message ?? 'Discovery failed' })
  }
}
