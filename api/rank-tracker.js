/**
 * Rank Tracker — DataForSEO integration
 *
 * GET  /api/rank-tracker?action=keywords&clientId=...          → list tracked keywords
 * POST /api/rank-tracker?action=add&clientId=...               → add keywords (body: { keywords, domain, locationCode, languageCode })
 * POST /api/rank-tracker?action=delete&clientId=...            → delete keyword (body: { keywordId })
 * POST /api/rank-tracker?action=check&clientId=...             → trigger DataForSEO check for all keywords
 * GET  /api/rank-tracker?action=results&clientId=...           → latest results per keyword
 */

import { createClient } from '@supabase/supabase-js'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

function db() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function dfsAuth() {
  const login    = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) throw new Error('DataForSEO credentials not configured')
  return 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64')
}

async function dfsPost(path, body) {
  const res  = await fetch(`${DATAFORSEO_BASE}${path}`, {
    method:  'POST',
    headers: { Authorization: dfsAuth(), 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const data = await res.json()
  if (data.status_code !== 20000) throw new Error(data.status_message ?? 'DataForSEO error')
  return data
}

async function dfsGet(path) {
  const res  = await fetch(`${DATAFORSEO_BASE}${path}`, {
    headers: { Authorization: dfsAuth() },
  })
  const data = await res.json()
  if (data.status_code !== 20000) throw new Error(data.status_message ?? 'DataForSEO error')
  return data
}

// ── SERP check for a single keyword + domain ──────────────────────────────────

async function checkKeywordRanking(keyword, domain, locationCode = 2036, languageCode = 'en') {
  const data = await dfsPost('/serp/google/organic/live/advanced', [{
    keyword,
    location_code:        locationCode,
    language_code:        languageCode,
    calculate_rectangles: false,
    device:               'desktop',
    depth:                100,
  }])

  const task  = data.tasks?.[0]
  const items = task?.result?.[0]?.items ?? []
  const cost  = data.cost ?? 0

  let position   = null
  let rankingUrl = null
  const serpFeatureSet = new Set()

  for (const item of items) {
    // Collect SERP feature types (non-organic items)
    if (item.type !== 'organic') {
      serpFeatureSet.add(item.type)
      continue
    }
    // Domain match — use rank_group (organic position, same as SEMrush/Agency Analytics)
    // Break on first match to get the best-ranking page for the domain
    if (!position) {
      const normItem   = item.domain?.replace(/^www\./, '') ?? ''
      const normTarget = domain?.replace(/^www\./, '') ?? ''
      if (normItem && normTarget && normItem === normTarget) {
        position   = item.rank_group   // organic position (1, 2, 3…)
        rankingUrl = item.url
      }
    }
  }

  console.log(`[rank-tracker] "${keyword}" | domain: ${domain} | organic position: ${position ?? 'NOT FOUND'} | cost: $${cost}`)
  return { position, url: rankingUrl, serpFeatures: [...serpFeatureSet].slice(0, 5), cost }
}

// ── Volume + difficulty ───────────────────────────────────────────────────────

async function getKeywordMetrics(keywords, locationCode = 2036, languageCode = 'en') {
  const data  = await dfsPost('/keywords_data/google_ads/search_volume/live', [{
    keywords,
    location_code:  locationCode,
    language_code:  languageCode,
  }])

  const items = data.tasks?.[0]?.result ?? []
  const map   = {}
  for (const item of items) {
    map[item.keyword] = {
      volume:      item.search_volume ?? 0,
      competition: item.competition_index ?? 0,
      cpc:         item.cpc ?? 0,
    }
  }
  return { map, cost: data.cost ?? 0 }
}

async function getKeywordDifficulty(keywords, locationCode = 2036, languageCode = 'en') {
  try {
    const res  = await fetch(`${DATAFORSEO_BASE}/dataforseo_labs/google/keyword_difficulty/live`, {
      method:  'POST',
      headers: { Authorization: dfsAuth(), 'Content-Type': 'application/json' },
      body:    JSON.stringify([{ keywords, location_code: locationCode, language_code: languageCode }]),
    })
    const data  = await res.json()
    const items = data.tasks?.[0]?.result?.[0]?.items ?? []
    const map   = {}
    for (const item of items) {
      map[item.keyword] = item.keyword_difficulty ?? null
    }
    return { map, cost: data.cost ?? 0 }
  } catch (err) {
    console.error('[rank-tracker] keyword difficulty error:', err.message)
    return { map: {}, cost: 0 }
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action, clientId } = req.query
  if (!clientId) return res.status(400).json({ error: 'clientId required' })

  const supabase = db()

  // ── List keywords ──────────────────────────────────────────────────────────
  if (action === 'keywords' && req.method === 'GET') {
    const { data, error } = await supabase
      .from('rank_tracker_keywords')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data ?? [])
  }

  // ── Add keywords ───────────────────────────────────────────────────────────
  if (action === 'add' && req.method === 'POST') {
    const { keywords, domain, locationCode = 2036, languageCode = 'en' } = req.body
    if (!keywords?.length) return res.status(400).json({ error: 'keywords required' })

    const rows = keywords.map(kw => ({
      client_id:     clientId,
      keyword:       kw.trim().toLowerCase(),
      domain:        domain ?? null,
      location_code: locationCode,
      language_code: languageCode,
    }))

    const { data, error } = await supabase
      .from('rank_tracker_keywords')
      .upsert(rows, { onConflict: 'client_id,keyword', ignoreDuplicates: true })
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ added: data?.length ?? 0 })
  }

  // ── Delete keyword ─────────────────────────────────────────────────────────
  if (action === 'delete' && req.method === 'POST') {
    const { keywordId } = req.body
    if (!keywordId) return res.status(400).json({ error: 'keywordId required' })
    await supabase.from('rank_tracker_keywords').delete().eq('id', keywordId).eq('client_id', clientId)
    await supabase.from('rank_tracker_results').delete().eq('keyword_id', keywordId)
    return res.json({ ok: true })
  }

  // ── Get latest results ─────────────────────────────────────────────────────
  if (action === 'results' && req.method === 'GET') {
    const days = parseInt(req.query.days) || 0

    const { data: keywords } = await supabase
      .from('rank_tracker_keywords')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (!keywords?.length) return res.json([])

    // Get latest + period-start result per keyword for change calculation
    const results = await Promise.all(keywords.map(async kw => {
      // Always get the latest result
      const { data: latestRows } = await supabase
        .from('rank_tracker_results')
        .select('*')
        .eq('keyword_id', kw.id)
        .order('checked_at', { ascending: false })
        .limit(1)

      const latest = latestRows?.[0] ?? null

      // Get the comparison result: oldest within the period (or overall oldest if days=0)
      let previous = null
      if (days > 0) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        const { data: periodRows } = await supabase
          .from('rank_tracker_results')
          .select('*')
          .eq('keyword_id', kw.id)
          .gte('checked_at', since)
          .order('checked_at', { ascending: true })
          .limit(1)
        previous = periodRows?.[0] ?? null
        // If only one result in the period, no comparison
        if (previous?.id === latest?.id) previous = null
      } else {
        // "All" — compare against oldest result
        const { data: oldestRows } = await supabase
          .from('rank_tracker_results')
          .select('*')
          .eq('keyword_id', kw.id)
          .order('checked_at', { ascending: true })
          .limit(1)
        previous = oldestRows?.[0] ?? null
        if (previous?.id === latest?.id) previous = null
      }

      const change = latest && previous && latest.position && previous.position
        ? previous.position - latest.position   // positive = improved
        : null

      return {
        ...kw,
        position:     latest?.position      ?? null,
        url:          latest?.url           ?? null,
        serpFeatures: latest?.serp_features ?? [],
        volume:       latest?.volume        ?? null,
        difficulty:   latest?.difficulty    ?? null,
        change,
        lastChecked:  latest?.checked_at    ?? null,
        previousPosition: previous?.position ?? null,
      }
    }))

    return res.json(results)
  }

  // ── Trigger check ──────────────────────────────────────────────────────────
  if (action === 'check' && req.method === 'POST') {
    const { data: keywords } = await supabase
      .from('rank_tracker_keywords')
      .select('*')
      .eq('client_id', clientId)

    if (!keywords?.length) return res.json({ checked: 0 })

    // Fallback domain: look up client's website_url if any keyword is missing a domain
    const anyMissingDomain = keywords.some(k => !k.domain)
    let clientDomain = null
    if (anyMissingDomain) {
      const { data: client } = await supabase
        .from('clients')
        .select('website')
        .eq('id', clientId)
        .single()
      if (client?.website) {
        clientDomain = client.website
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '')
      }
    }

    // Get volume + difficulty for all keywords in one call
    const kwStrings = keywords.map(k => k.keyword)
    const locationCode  = keywords[0].location_code ?? 2036
    const languageCode  = keywords[0].language_code ?? 'en'

    const [volumeResult, diffResult] = await Promise.all([
      getKeywordMetrics(kwStrings, locationCode, languageCode).catch(() => ({ map: {}, cost: 0 })),
      getKeywordDifficulty(kwStrings, locationCode, languageCode).catch(() => ({ map: {}, cost: 0 })),
    ])
    const volumeMap = volumeResult.map ?? volumeResult
    const diffMap   = diffResult.map   ?? diffResult

    let totalCost = (volumeResult.cost ?? 0) + (diffResult.cost ?? 0)

    // Check rankings one by one (avoid rate limits)
    const checkedAt = new Date().toISOString()
    let checked = 0

    for (const kw of keywords) {
      try {
        const domain  = kw.domain || clientDomain
        const ranking = await checkKeywordRanking(kw.keyword, domain, kw.location_code, kw.language_code)
        const metrics = volumeMap[kw.keyword] ?? {}
        totalCost += ranking.cost ?? 0

        await supabase.from('rank_tracker_results').insert({
          keyword_id:    kw.id,
          client_id:     clientId,
          position:      ranking.position,
          url:           ranking.url,
          serp_features: ranking.serpFeatures,
          volume:        metrics.volume ?? null,
          difficulty:    diffMap[kw.keyword] ?? null,
          checked_at:    checkedAt,
        })
        checked++
      } catch (err) {
        console.error(`[rank-tracker] ${kw.keyword}:`, err.message)
      }
    }

    const costUsd = Math.round(totalCost * 10000) / 10000
    console.log(`[rank-tracker] check complete — ${checked}/${keywords.length} keywords, total cost: $${costUsd}`)
    return res.json({ checked, total: keywords.length, costUsd })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
