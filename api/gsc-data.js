/**
 * Google data — Search Console + Analytics GA4 combined
 *
 * GSC:  GET /api/gsc-data?type=gsc&clientId=...&siteUrl=...&days=28
 * GA4:  GET /api/gsc-data?type=ga4&clientId=...&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * Info: GET /api/gsc-data?type=info&clientId=...   → returns connection + available properties
 * Save: POST /api/gsc-data?type=save-ga4&clientId=...&propertyId=...
 */
import { createClient } from '@supabase/supabase-js'

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error_description ?? data.error)
  return {
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

async function getConnection(supabase, clientId) {
  const { data: conn, error } = await supabase
    .from('digital_gsc_connections')
    .select('*')
    .eq('client_id', clientId)
    .single()
  if (error || !conn) return null
  return conn
}

async function getValidToken(supabase, conn) {
  let token = conn.access_token
  if (conn.refresh_token && conn.expires_at && new Date(conn.expires_at) < new Date()) {
    const refreshed = await refreshAccessToken(conn.refresh_token)
    token = refreshed.access_token
    await supabase.from('digital_gsc_connections').update({
      access_token: refreshed.access_token,
      expires_at:   refreshed.expires_at,
      updated_at:   new Date().toISOString(),
    }).eq('client_id', conn.client_id)
  }
  return token
}

// ── GA4 helper ────────────────────────────────────────────────────────────────

async function runGA4Report(propertyId, token, body) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error))
  return data
}

function ga4Rows(report) {
  return (report?.rows ?? []).map(row => {
    const obj = {}
    ;(report.dimensionHeaders ?? []).forEach((h, i) => { obj[h.name] = row.dimensionValues?.[i]?.value })
    ;(report.metricHeaders   ?? []).forEach((h, i) => { obj[h.name] = Number(row.metricValues?.[i]?.value ?? 0) })
    return obj
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { type = 'gsc', clientId } = req.query
  if (!clientId) return res.status(400).json({ error: 'clientId required' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // ── Connection info ────────────────────────────────────────────
  if (type === 'info') {
    const conn = await getConnection(supabase, clientId)
    if (!conn) return res.json({ connected: false })
    return res.json({
      connected:      true,
      googleEmail:    conn.google_email,
      sites:          conn.sites ?? [],
      ga4Properties:  conn.ga4_properties ?? [],
      ga4PropertyId:  conn.ga4_property_id ?? null,
    })
  }

  // ── Save selected GA4 property ─────────────────────────────────
  if (type === 'save-ga4') {
    const { propertyId } = req.query
    if (!propertyId) return res.status(400).json({ error: 'propertyId required' })
    await supabase.from('digital_gsc_connections')
      .update({ ga4_property_id: propertyId, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
    return res.json({ ok: true })
  }

  // ── Get connection + refresh token ─────────────────────────────
  const conn = await getConnection(supabase, clientId)
  if (!conn) return res.status(404).json({ error: 'Google not connected for this client' })

  let token
  try {
    token = await getValidToken(supabase, conn)
  } catch {
    return res.status(401).json({ error: 'Token refresh failed — please reconnect Google' })
  }

  // ── GSC data ───────────────────────────────────────────────────
  if (type === 'gsc') {
    const { siteUrl, days = '28' } = req.query
    if (!siteUrl) return res.status(400).json({ error: 'siteUrl required' })

    const endDate   = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(days, 10))
    const fmt = d => d.toISOString().split('T')[0]

    try {
      const [queryRes, pagesRes] = await Promise.all([
        fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ['query'], rowLimit: 50, orderBy: [{ field: 'impressions', sortOrder: 'DESCENDING' }] }),
        }).then(r => r.json()),
        fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ['page'], rowLimit: 20, orderBy: [{ field: 'clicks', sortOrder: 'DESCENDING' }] }),
        }).then(r => r.json()),
      ])

      if (queryRes.error) throw new Error(queryRes.error.message)

      return res.json({
        siteUrl,
        dateRange:   { start: fmt(startDate), end: fmt(endDate) },
        googleEmail: conn.google_email,
        queries: (queryRes.rows ?? []).map(r => ({ keyword: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: Math.round(r.ctr * 1000) / 10, position: Math.round(r.position * 10) / 10 })),
        pages:   (pagesRes.rows ?? []).map(r => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: Math.round(r.ctr * 1000) / 10, position: Math.round(r.position * 10) / 10 })),
      })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ── GA4 data ───────────────────────────────────────────────────
  if (type === 'ga4') {
    const { dateFrom, dateTo } = req.query
    const propertyId = req.query.propertyId || conn.ga4_property_id
    if (!propertyId) return res.status(400).json({ error: 'No GA4 property selected for this client' })
    if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom and dateTo required' })

    try {
      const dateRange = [{ startDate: dateFrom, endDate: dateTo }]

      const [overviewReport, channelReport, pagesReport, deviceReport] = await Promise.all([
        // Daily overview — sessions, users, pageviews, bounce rate, duration
        runGA4Report(propertyId, token, {
          dateRanges: dateRange,
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
            { name: 'newUsers' },
            { name: 'screenPageViews' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
          ],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        }),
        // Traffic channels
        runGA4Report(propertyId, token, {
          dateRanges: dateRange,
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics:    [{ name: 'sessions' }, { name: 'activeUsers' }],
          orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
        }),
        // Top pages
        runGA4Report(propertyId, token, {
          dateRanges: dateRange,
          dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
          metrics:    [{ name: 'screenPageViews' }, { name: 'sessions' }, { name: 'averageSessionDuration' }],
          orderBys:   [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit:      10,
        }),
        // Device breakdown
        runGA4Report(propertyId, token, {
          dateRanges: dateRange,
          dimensions: [{ name: 'deviceCategory' }],
          metrics:    [{ name: 'sessions' }],
        }),
      ])

      const dailyRows = ga4Rows(overviewReport)

      // Aggregate totals
      const totals = dailyRows.reduce((acc, row) => ({
        sessions:               acc.sessions               + row.sessions,
        activeUsers:            acc.activeUsers            + row.activeUsers,
        newUsers:               acc.newUsers               + row.newUsers,
        screenPageViews:        acc.screenPageViews        + row.screenPageViews,
        bounceRate:             acc.bounceRate             + row.bounceRate,
        averageSessionDuration: acc.averageSessionDuration + row.averageSessionDuration,
      }), { sessions: 0, activeUsers: 0, newUsers: 0, screenPageViews: 0, bounceRate: 0, averageSessionDuration: 0 })

      const days = dailyRows.length || 1
      totals.bounceRate             = totals.bounceRate             / days
      totals.averageSessionDuration = totals.averageSessionDuration / days

      // Format date series
      const series = dailyRows.map(row => ({
        date:     `${row.date.slice(0,4)}-${row.date.slice(4,6)}-${row.date.slice(6,8)}`,
        sessions: row.sessions,
        users:    row.activeUsers,
        pageviews: row.screenPageViews,
      }))

      return res.json({
        propertyId,
        totals: {
          sessions:        Math.round(totals.sessions),
          users:           Math.round(totals.activeUsers),
          newUsers:        Math.round(totals.newUsers),
          pageviews:       Math.round(totals.screenPageViews),
          bounceRate:      Math.round(totals.bounceRate * 100) / 100,
          avgDuration:     Math.round(totals.averageSessionDuration),
        },
        series,
        channels: ga4Rows(channelReport).map(r => ({
          channel:  r.sessionDefaultChannelGroup,
          sessions: r.sessions,
          users:    r.activeUsers,
        })),
        topPages: ga4Rows(pagesReport).map(r => ({
          path:      r.pagePath,
          title:     r.pageTitle,
          pageviews: r.screenPageViews,
          sessions:  r.sessions,
          avgTime:   Math.round(r.averageSessionDuration),
        })),
        devices: ga4Rows(deviceReport).map(r => ({
          device:   r.deviceCategory,
          sessions: r.sessions,
        })),
      })
    } catch (err) {
      console.error('[gsc-data ga4]', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(400).json({ error: `Unknown type: ${type}` })
}
