/**
 * Google OAuth — Search Console + Analytics combined
 * GET /api/gsc-oauth?action=auth&clientId=...&from=gsc|ga4  → redirects to Google
 * GET /api/gsc-oauth?code=...&state=<json>                  → OAuth callback
 */
import { createClient } from '@supabase/supabase-js'

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

const REDIRECT_DESTINATIONS = {
  gsc: '/digital/rank-tracking',
  ga4: '/reporting/live-data/google-analytics',
}

export default async function handler(req, res) {
  const appUrl      = process.env.VITE_APP_URL || `https://${process.env.VERCEL_URL}`
  const redirectUri = `${appUrl}/api/gsc-oauth`

  // ── Initiate OAuth ─────────────────────────────────────────────
  if (req.query.action === 'auth') {
    const { clientId, from = 'gsc' } = req.query
    if (!clientId) return res.status(400).json({ error: 'clientId required' })

    const googleClientId = process.env.GOOGLE_CLIENT_ID
    if (!googleClientId) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' })

    const state = Buffer.from(JSON.stringify({ clientId, from })).toString('base64')

    const params = new URLSearchParams({
      client_id:     googleClientId,
      redirect_uri:  redirectUri,
      response_type: 'code',
      scope:         SCOPES,
      access_type:   'offline',
      prompt:        'consent',
      state,
    })

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  }

  // ── OAuth callback ─────────────────────────────────────────────
  const { code, state: rawState, error } = req.query

  let clientId = rawState
  let from     = 'gsc'

  // Try to parse new JSON state; fall back to legacy plain clientId
  try {
    const decoded = JSON.parse(Buffer.from(rawState, 'base64').toString('utf8'))
    clientId = decoded.clientId
    from     = decoded.from ?? 'gsc'
  } catch {
    // legacy: state is just clientId string
    clientId = rawState
  }

  const destination = REDIRECT_DESTINATIONS[from] ?? REDIRECT_DESTINATIONS.gsc

  if (error) {
    return res.redirect(`${destination}?gsc_error=${encodeURIComponent(error)}`)
  }
  if (!code || !clientId) {
    return res.redirect(`${destination}?gsc_error=Missing+code+or+client`)
  }

  const googleClientId     = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     googleClientId,
        client_secret: googleClientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (tokens.error) throw new Error(tokens.error_description ?? tokens.error)

    // Get user email
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const user = await userRes.json()

    // Get GSC sites
    const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const sitesData = await sitesRes.json()
    const sites = (sitesData.siteEntry ?? []).map(s => s.siteUrl)

    // Get GA4 properties via Analytics Admin API
    const ga4Res = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=50',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )
    const ga4Data   = await ga4Res.json()
    const ga4Props  = []
    for (const account of ga4Data.accountSummaries ?? []) {
      for (const prop of account.propertySummaries ?? []) {
        ga4Props.push({
          id:          prop.property.replace('properties/', ''),
          name:        prop.displayName,
          accountName: account.displayName,
        })
      }
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    await supabase.from('digital_gsc_connections').upsert({
      client_id:      clientId,
      google_email:   user.email ?? null,
      access_token:   tokens.access_token,
      refresh_token:  tokens.refresh_token ?? null,
      expires_at:     tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      sites,
      ga4_properties: ga4Props,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'client_id' })

    return res.redirect(`${destination}?gsc_connected=1&client=${clientId}`)
  } catch (err) {
    console.error('[gsc-oauth]', err)
    return res.redirect(`${destination}?gsc_error=${encodeURIComponent(err.message)}`)
  }
}
