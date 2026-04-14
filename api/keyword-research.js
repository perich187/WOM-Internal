/**
 * Keyword Research — DataForSEO integration
 *
 * POST /api/keyword-research?action=domain
 *   body: { domain, limit?, locationCode?, languageCode? }
 *   Tries Labs ranked_keywords first (organic positions for large sites).
 *   Falls back to keyword_for_site (Google Ads suggestions — works for any domain).
 *
 * POST /api/keyword-research?action=ideas
 *   body: { keyword, limit?, locationCode?, languageCode? }
 *   Related keyword ideas with volume, difficulty, CPC.
 *
 * POST /api/keyword-research?action=serp
 *   body: { keyword, locationCode?, languageCode? }
 *   Top 10 organic SERP results for a keyword.
 */

import { createClient } from '@supabase/supabase-js'

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function saveHistory({ clientId, action, query, locationCode, resultCount, source, results }) {
  try {
    const sb = getSupabase()
    if (!sb) return
    await sb.from('keyword_research_history').insert({
      client_id:     clientId || null,
      action,
      query,
      location_code: locationCode ?? 2036,
      result_count:  resultCount ?? 0,
      source:        source || null,
      results,
    })
  } catch (err) {
    console.warn('[keyword-research] DB save failed:', err.message)
  }
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
  // Log task-level errors for debugging
  const taskCode = data.tasks?.[0]?.status_code
  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO error on ${path}: ${data.status_message} (${data.status_code})`)
  }
  if (taskCode && taskCode !== 20000) {
    console.warn(`[keyword-research] task error on ${path}: ${data.tasks[0].status_message} (${taskCode})`)
  }
  return data
}

function cleanDomain(input) {
  try {
    const withProto = input.startsWith('http') ? input : `https://${input}`
    return new URL(withProto).hostname.replace(/^www\./, '')
  } catch {
    return input.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  }
}

// ── Domain Analysis ───────────────────────────────────────────────────────────

async function domainAnalysis({ domain, limit = 50, locationCode = 2036, languageCode = 'en' }) {
  const cleanedDomain = cleanDomain(domain)

  // ── Strategy 1: Labs ranked_keywords (gives actual organic positions) ──────
  // Works well for established sites with meaningful organic presence.
  try {
    const data = await dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{
      target:        cleanedDomain,
      location_code: locationCode,
      language_code: languageCode,
      limit:         Math.min(limit, 100),
      order_by:      ['keyword_data.keyword_info.search_volume,desc'],
      filters:       ['keyword_data.keyword_info.search_volume', '>', 0],
    }])

    const items = data.tasks?.[0]?.result?.[0]?.items ?? []
    if (items.length > 0) {
      return {
        source: 'organic',
        domain: cleanedDomain,
        items: items.map(item => ({
          keyword:     item.keyword_data?.keyword,
          position:    item.ranked_serp_element?.serp_item?.rank_group ?? null,
          url:         item.ranked_serp_element?.serp_item?.url ?? null,
          volume:      item.keyword_data?.keyword_info?.search_volume ?? null,
          cpc:         item.keyword_data?.keyword_info?.cpc ?? null,
          difficulty:  item.keyword_data?.keyword_properties?.keyword_difficulty ?? null,
          competition: item.keyword_data?.keyword_info?.competition ?? null,
          trend:       item.keyword_data?.keyword_info?.monthly_searches ?? [],
        })),
      }
    }
    console.log(`[keyword-research] ranked_keywords returned 0 for ${cleanedDomain}, trying fallback`)
  } catch (err) {
    console.warn('[keyword-research] ranked_keywords failed, trying fallback:', err.message)
  }

  // ── Strategy 2: Google Ads keyword_for_site (always returns results) ────────
  // Uses Google Ads API to find keywords relevant to the domain.
  // No position data, but works for any domain including small sites.
  const data = await dfsPost('/keywords_data/google_ads/keywords_for_site/live', [{
    target:        cleanedDomain,
    location_code: locationCode,
    language_code: languageCode,
    limit:         Math.min(limit, 100),
  }])

  const items = data.tasks?.[0]?.result ?? []
  return {
    source: 'ads_suggestions',
    domain: cleanedDomain,
    items: items
      .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
      .map(item => ({
        keyword:     item.keyword,
        position:    null,   // not available from this endpoint
        url:         null,
        volume:      item.search_volume ?? null,
        cpc:         item.cpc ?? null,
        difficulty:  null,   // not available from this endpoint
        competition: item.competition ?? null,
        trend:       item.monthly_searches ?? [],
      })),
  }
}

// ── Keyword Ideas ─────────────────────────────────────────────────────────────

async function keywordIdeas({ keyword, limit = 50, locationCode = 2036, languageCode = 'en' }) {
  // Run suggestions + seed volume in parallel
  const [suggestData, volumeData] = await Promise.all([
    dfsPost('/dataforseo_labs/google/keyword_suggestions/live', [{
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      limit:         Math.min(limit, 100),
      order_by:      ['keyword_info.search_volume,desc'],
      filters:       ['keyword_info.search_volume', '>', 0],
    }]),
    dfsPost('/keywords_data/google_ads/search_volume/live', [{
      keywords:      [keyword],
      location_code: locationCode,
      language_code: languageCode,
    }]),
  ])

  const seedMetrics  = volumeData.tasks?.[0]?.result?.[0] ?? {}
  const suggestions  = (suggestData.tasks?.[0]?.result?.[0]?.items ?? []).map(item => ({
    keyword:     item.keyword,
    volume:      item.keyword_info?.search_volume ?? null,
    cpc:         item.keyword_info?.cpc ?? null,
    difficulty:  item.keyword_properties?.keyword_difficulty ?? null,
    competition: item.keyword_info?.competition ?? null,
    trend:       item.keyword_info?.monthly_searches ?? [],
  }))

  return {
    seed: {
      keyword,
      volume:      seedMetrics.search_volume ?? null,
      cpc:         seedMetrics.cpc ?? null,
      competition: seedMetrics.competition ?? null,
    },
    suggestions,
  }
}

// ── SERP Preview ──────────────────────────────────────────────────────────────

async function serpPreview({ keyword, locationCode = 2036, languageCode = 'en' }) {
  const data  = await dfsPost('/serp/google/organic/live/advanced', [{
    keyword,
    location_code:        locationCode,
    language_code:        languageCode,
    device:               'desktop',
    depth:                10,
    calculate_rectangles: false,
  }])

  const items    = data.tasks?.[0]?.result?.[0]?.items ?? []
  const organic  = []
  const features = []

  for (const item of items) {
    if (item.type === 'organic') {
      organic.push({
        position:    item.rank_group,
        title:       item.title,
        url:         item.url,
        domain:      item.domain,
        description: item.description,
      })
    } else {
      features.push(item.type)
    }
  }

  return { keyword, organic, features: [...new Set(features)] }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'POST required' })
  }

  const action = req.query.action
  if (!['domain', 'ideas', 'serp'].includes(action)) {
    return res.status(400).json({ ok: false, error: `Unknown action: ${action}` })
  }

  const { clientId, locationCode } = req.body ?? {}

  try {
    let result
    if (action === 'domain') {
      if (!req.body?.domain) return res.status(400).json({ ok: false, error: 'domain required' })
      result = await domainAnalysis(req.body)
      saveHistory({
        clientId, action, query: result.domain, locationCode,
        resultCount: result.items?.length ?? 0,
        source: result.source, results: result.items ?? [],
      })
      return res.status(200).json({ ok: true, action, ...result })
    }
    if (action === 'ideas') {
      if (!req.body?.keyword) return res.status(400).json({ ok: false, error: 'keyword required' })
      result = await keywordIdeas(req.body)
      saveHistory({
        clientId, action, query: req.body.keyword, locationCode,
        resultCount: result.suggestions?.length ?? 0,
        results: result.suggestions ?? [],
      })
      return res.status(200).json({ ok: true, action, ...result })
    }
    if (action === 'serp') {
      if (!req.body?.keyword) return res.status(400).json({ ok: false, error: 'keyword required' })
      result = await serpPreview(req.body)
      saveHistory({
        clientId, action, query: req.body.keyword, locationCode,
        resultCount: result.organic?.length ?? 0,
        results: result.organic ?? [],
      })
      return res.status(200).json({ ok: true, action, ...result })
    }
  } catch (err) {
    console.error(`[keyword-research/${action}]`, err)
    return res.status(500).json({ ok: false, error: err.message ?? 'DataForSEO request failed' })
  }
}
