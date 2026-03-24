/**
 * Fetch Google Search Console analytics (top queries / rankings)
 * GET /api/gsc-data?clientId=<id>&siteUrl=<url>&days=28
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { clientId, siteUrl, days = '28' } = req.query
  if (!clientId || !siteUrl) return res.status(400).json({ error: 'clientId and siteUrl required' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // Get stored tokens
  const { data: conn, error: connErr } = await supabase
    .from('digital_gsc_connections')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (connErr || !conn) return res.status(404).json({ error: 'Search Console not connected for this client' })

  let accessToken = conn.access_token

  // Refresh if expired
  if (conn.refresh_token && conn.expires_at && new Date(conn.expires_at) < new Date()) {
    try {
      const refreshed = await refreshAccessToken(conn.refresh_token)
      accessToken = refreshed.access_token
      await supabase.from('digital_gsc_connections').update({
        access_token: refreshed.access_token,
        expires_at:   refreshed.expires_at,
        updated_at:   new Date().toISOString(),
      }).eq('client_id', clientId)
    } catch (err) {
      return res.status(401).json({ error: 'Token refresh failed — please reconnect Search Console' })
    }
  }

  // Date range
  const endDate   = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - parseInt(days, 10))
  const fmt = d => d.toISOString().split('T')[0]

  try {
    // Top queries (rank tracking)
    const queryRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate:   fmt(endDate),
          dimensions: ['query'],
          rowLimit:   50,
          orderBy: [{ field: 'impressions', sortOrder: 'DESCENDING' }],
        }),
      }
    )
    const queryData = await queryRes.json()
    if (queryData.error) throw new Error(queryData.error.message)

    // Top pages
    const pagesRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate:  fmt(startDate),
          endDate:    fmt(endDate),
          dimensions: ['page'],
          rowLimit:   20,
          orderBy: [{ field: 'clicks', sortOrder: 'DESCENDING' }],
        }),
      }
    )
    const pagesData = await pagesRes.json()

    const queries = (queryData.rows ?? []).map(r => ({
      keyword:     r.keys[0],
      clicks:      r.clicks,
      impressions: r.impressions,
      ctr:         Math.round(r.ctr * 1000) / 10,
      position:    Math.round(r.position * 10) / 10,
    }))

    const pages = (pagesData.rows ?? []).map(r => ({
      page:        r.keys[0],
      clicks:      r.clicks,
      impressions: r.impressions,
      ctr:         Math.round(r.ctr * 1000) / 10,
      position:    Math.round(r.position * 10) / 10,
    }))

    return res.json({
      siteUrl,
      dateRange: { start: fmt(startDate), end: fmt(endDate) },
      queries,
      pages,
      googleEmail: conn.google_email,
    })
  } catch (err) {
    console.error('[gsc-data]', err)
    return res.status(500).json({ error: err.message })
  }
}
