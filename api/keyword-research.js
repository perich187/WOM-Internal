/**
 * Keyword Research — DataForSEO integration
 *
 * POST /api/keyword-research?action=domain
 *   body: { domain, limit?, locationCode?, languageCode? }
 *   → keywords a domain ranks for organically (competitor research)
 *
 * POST /api/keyword-research?action=ideas
 *   body: { keyword, limit?, locationCode?, languageCode? }
 *   → related keyword ideas with volume, difficulty, CPC
 *
 * POST /api/keyword-research?action=serp
 *   body: { keyword, locationCode?, languageCode? }
 *   → top 10 SERP results for a keyword
 */

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

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
  if (data.status_code !== 20000) {
    throw new Error(data.status_message ?? `DataForSEO error on ${path}`)
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
// Returns keywords a domain ranks for organically — equivalent to
// SEMrush "Organic Research → Keywords" tab.

async function domainAnalysis({ domain, limit = 50, locationCode = 2036, languageCode = 'en' }) {
  const cleanedDomain = cleanDomain(domain)

  const data = await dfsPost('/dataforseo_labs/google/ranked_keywords/live', [{
    target:         cleanedDomain,
    location_code:  locationCode,
    language_code:  languageCode,
    limit:          Math.min(limit, 100),
    order_by:       ['keyword_data.keyword_info.search_volume,desc'],
    filters:        ['keyword_data.keyword_info.search_volume', '>', 0],
  }])

  const items = data.tasks?.[0]?.result?.[0]?.items ?? []
  return items.map(item => ({
    keyword:    item.keyword_data?.keyword,
    position:   item.ranked_serp_element?.serp_item?.rank_group,
    url:        item.ranked_serp_element?.serp_item?.url,
    volume:     item.keyword_data?.keyword_info?.search_volume,
    cpc:        item.keyword_data?.keyword_info?.cpc,
    difficulty: item.keyword_data?.keyword_properties?.keyword_difficulty,
    competition: item.keyword_data?.keyword_info?.competition,
    trend:      item.keyword_data?.keyword_info?.monthly_searches ?? [],
  }))
}

// ── Keyword Ideas ─────────────────────────────────────────────────────────────
// Returns related keywords for a seed keyword — equivalent to
// Ubersuggest / SEMrush "Keyword Magic Tool".

async function keywordIdeas({ keyword, limit = 50, locationCode = 2036, languageCode = 'en' }) {
  // Run keyword suggestions + volume in parallel
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

  // Seed keyword metrics
  const seedMetrics = volumeData.tasks?.[0]?.result?.[0] ?? {}

  // Suggestions
  const items = suggestData.tasks?.[0]?.result?.[0]?.items ?? []
  const suggestions = items.map(item => ({
    keyword:    item.keyword,
    volume:     item.keyword_info?.search_volume,
    cpc:        item.keyword_info?.cpc,
    difficulty: item.keyword_properties?.keyword_difficulty,
    competition: item.keyword_info?.competition,
    trend:      item.keyword_info?.monthly_searches ?? [],
  }))

  return {
    seed: {
      keyword,
      volume:     seedMetrics.search_volume,
      cpc:        seedMetrics.cpc,
      competition: seedMetrics.competition,
    },
    suggestions,
  }
}

// ── SERP Preview ──────────────────────────────────────────────────────────────
// Returns the top 10 organic SERP results for a keyword.

async function serpPreview({ keyword, locationCode = 2036, languageCode = 'en' }) {
  const data = await dfsPost('/serp/google/organic/live/advanced', [{
    keyword,
    location_code:        locationCode,
    language_code:        languageCode,
    device:               'desktop',
    depth:                10,
    calculate_rectangles: false,
  }])

  const items = data.tasks?.[0]?.result?.[0]?.items ?? []

  // Separate organic results from SERP features
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

  try {
    let result
    if (action === 'domain') {
      if (!req.body?.domain) return res.status(400).json({ ok: false, error: 'domain required' })
      result = await domainAnalysis(req.body)
    } else if (action === 'ideas') {
      if (!req.body?.keyword) return res.status(400).json({ ok: false, error: 'keyword required' })
      result = await keywordIdeas(req.body)
    } else {
      if (!req.body?.keyword) return res.status(400).json({ ok: false, error: 'keyword required' })
      result = await serpPreview(req.body)
    }
    return res.status(200).json({ ok: true, action, ...result })
  } catch (err) {
    console.error(`[keyword-research/${action}]`, err)
    return res.status(500).json({ ok: false, error: err.message ?? 'DataForSEO request failed' })
  }
}
