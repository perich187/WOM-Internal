/**
 * Fetch real Meta (Facebook + Instagram) insights for a client + date range.
 * Returns aggregated totals AND daily time-series for charting.
 *
 * GET /api/meta-insights?clientId=...&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */

import { createClient } from '@supabase/supabase-js'

const GRAPH = 'https://graph.facebook.com/v19.0'

function db() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function graphGet(path, params = {}) {
  const url = new URL(`${GRAPH}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res  = await fetch(url)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

/** Extract totals AND daily series from a Page Insights response */
function processInsights(insightResponse) {
  const totals = {}
  const series = {}

  for (const metric of insightResponse?.data ?? []) {
    const values = metric.values ?? []
    const isSnapshot = metric.name === 'follower_count'

    if (isSnapshot) {
      totals[metric.name] = values[values.length - 1]?.value ?? 0
    } else {
      totals[metric.name] = values.reduce((s, v) => s + (v.value ?? 0), 0)
    }

    series[metric.name] = values.map(v => ({
      date:  v.end_time?.slice(0, 10) ?? '',
      value: v.value ?? 0,
    }))
  }

  return { totals, series }
}

// ── Facebook ──────────────────────────────────────────────────────────────────

async function fetchMetric(pageId, token, metric, since, until, period = 'day') {
  return graphGet(`/${pageId}/insights`, {
    metric,
    period,
    since,
    until,
    access_token: token,
  }).then(res => {
    const item = res?.data?.[0]
    if (!item) return null
    return { name: item.name, values: item.values ?? [], period }
  }).catch(err => {
    console.warn(`[meta-insights] ${metric} (${period}) failed:`, err.message)
    return null
  })
}

async function facebookInsights(pageId, token, since, until) {
  const ALL_METRICS = [
    'page_impressions',
    'page_impressions_unique',
    'page_impressions_organic_unique',
    'page_impressions_paid_unique',
    'page_engaged_users',
    'page_post_engagements',
    'page_fan_adds',
    'page_fan_removes',
    'page_views_total',
    'page_video_views',
  ]

  const metricResults = await Promise.all(
    ALL_METRICS.map(m => fetchMetric(pageId, token, m, since, until, 'day'))
  )

  const ins    = {}
  const series = {}
  for (const r of metricResults.filter(Boolean)) {
    series[r.name] = r.values.map(v => ({ date: v.end_time?.slice(0, 10) ?? '', value: v.value ?? 0 }))
    ins[r.name]    = r.values.reduce((s, v) => s + (v.value ?? 0), 0)
  }

  console.log('[meta-insights] FB metrics:', Object.keys(ins), JSON.stringify(ins))

  const insightsError = Object.keys(ins).length === 0
    ? 'No insight metrics returned. Ensure read_insights permission is granted and reconnect.'
    : null

  // Posts engagement (likes, comments, shares)
  const postsRes = await graphGet(`/${pageId}/published_posts`, {
    fields:       'id,reactions.summary(true),comments.summary(true),shares',
    since,
    until,
    limit:        100,
    access_token: token,
  }).catch(() => null)

  const posts    = postsRes?.data ?? []
  let likes      = 0
  let comments   = 0
  let shares     = 0

  for (const post of posts) {
    likes    += post.reactions?.summary?.total_count ?? 0
    comments += post.comments?.summary?.total_count  ?? 0
    shares   += post.shares?.count                   ?? 0
  }

  // Current follower count
  const pageInfo = await graphGet(`/${pageId}`, {
    fields:       'followers_count,fan_count',
    access_token: token,
  }).catch(() => null)

  return {
    reach:           ins.page_impressions_unique         ?? 0,
    impressions:     ins.page_impressions                ?? 0,
    paidReach:       ins.page_impressions_paid_unique    ?? 0,
    organicReach:    ins.page_impressions_organic_unique ?? 0,
    engagement:      ins.page_engaged_users              ?? (likes + comments + shares),
    postEngagements: ins.page_post_engagements           ?? 0,
    pageViews:       ins.page_views_total                ?? 0,
    videoViews:      ins.page_video_views                ?? 0,
    newFollowers:    ins.page_fan_adds                   ?? 0,
    lostFollowers:   ins.page_fan_removes                ?? 0,
    likes,
    comments,
    shares,
    posts:           posts.length,
    followers:       pageInfo?.followers_count ?? pageInfo?.fan_count ?? 0,
    insights_error:  insightsError,

    _debug: Object.fromEntries(
      Object.entries(ins).map(([k, v]) => [k, { total: v, points: series[k]?.length ?? 0 }])
    ),

    series: {
      reach:         series.page_impressions_unique         ?? [],
      impressions:   series.page_impressions                ?? [],
      paidReach:     series.page_impressions_paid_unique    ?? [],
      organicReach:  series.page_impressions_organic_unique ?? [],
      engagement:    series.page_engaged_users              ?? [],
      pageViews:     series.page_views_total                ?? [],
      videoViews:    series.page_video_views                ?? [],
      newFollowers:  series.page_fan_adds                   ?? [],
      lostFollowers: series.page_fan_removes                ?? [],
    },
  }
}

// ── Instagram ─────────────────────────────────────────────────────────────────

async function instagramInsights(igUserId, token, since, until) {
  const IG_METRICS = [
    'impressions',
    'reach',
    'profile_views',
    'website_clicks',
  ].join(',')

  const acctIns = await graphGet(`/${igUserId}/insights`, {
    metric:       IG_METRICS,
    period:       'day',
    since,
    until,
    access_token: token,
  }).catch(err => {
    console.warn('[meta-insights] IG account insights failed:', err.message)
    return null
  })

  const { totals: ins, series } = processInsights(acctIns)

  // Media posted in range — like & comment counts
  const mediaRes = await graphGet(`/${igUserId}/media`, {
    fields:       'id,timestamp,like_count,comments_count',
    since,
    until,
    limit:        100,
    access_token: token,
  }).catch(() => null)

  const media    = mediaRes?.data ?? []
  let likes      = 0
  let comments   = 0

  for (const m of media) {
    likes    += m.like_count     ?? 0
    comments += m.comments_count ?? 0
  }

  // Current follower count
  const igInfo = await graphGet(`/${igUserId}`, {
    fields:       'followers_count,media_count',
    access_token: token,
  }).catch(() => null)

  return {
    // Totals
    reach:        ins.reach         ?? 0,
    impressions:  ins.impressions   ?? 0,
    profileViews: ins.profile_views ?? 0,
    websiteClicks:ins.website_clicks ?? 0,
    engagement:   likes + comments,
    likes,
    comments,
    shares:       0,
    newFollowers: 0,
    posts:        media.length,
    followers:    igInfo?.followers_count ?? 0,
    mediaCount:   igInfo?.media_count    ?? 0,

    // Daily series for charts
    series: {
      reach:        series.reach         ?? [],
      impressions:  series.impressions   ?? [],
      profileViews: series.profile_views ?? [],
      websiteClicks:series.website_clicks ?? [],
    },
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { clientId, dateFrom, dateTo } = req.query

  if (!clientId)             return res.status(400).json({ error: 'clientId required' })
  if (!dateFrom || !dateTo)  return res.status(400).json({ error: 'dateFrom and dateTo required (YYYY-MM-DD)' })

  const since = Math.floor(new Date(dateFrom).getTime()              / 1000)
  const until = Math.floor(new Date(dateTo + 'T23:59:59').getTime()  / 1000)

  const supabase = db()
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('platform, platform_user_id, access_token')
    .eq('client_id', clientId)
    .eq('connected', true)
    .in('platform', ['facebook', 'instagram'])

  if (!accounts?.length) {
    return res.status(404).json({ error: 'No connected Facebook or Instagram accounts for this client.' })
  }

  const results = {}

  for (const account of accounts) {
    if (!account.access_token || !account.platform_user_id) continue

    try {
      if (account.platform === 'facebook') {
        results.facebook = await facebookInsights(account.platform_user_id, account.access_token, since, until)
      } else if (account.platform === 'instagram') {
        results.instagram = await instagramInsights(account.platform_user_id, account.access_token, since, until)
      }
    } catch (err) {
      console.error(`[meta-insights] ${account.platform}:`, err.message)

      const isAuthError = /OAuthException|Invalid OAuth|token.*expir|access token.*invalid/i.test(err.message)
      if (isAuthError) {
        await supabase
          .from('social_accounts')
          .update({ connected: false, updated_at: new Date().toISOString() })
          .eq('client_id', clientId)
          .eq('platform', account.platform)
        results[account.platform] = { error: err.message, reconnect_required: true }
      } else {
        results[account.platform] = { error: err.message }
      }
    }
  }

  if (!Object.keys(results).length) {
    return res.status(404).json({ error: 'No valid Meta accounts found with access tokens.' })
  }

  return res.status(200).json(results)
}
