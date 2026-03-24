/**
 * Google OAuth callback — exchanges code for tokens and stores in Supabase
 * GET /api/gsc-callback?code=...&state=<clientId>
 */
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { code, state: clientId, error } = req.query

  const appUrl = process.env.VITE_APP_URL || `https://${process.env.VERCEL_URL}`

  if (error) {
    return res.redirect(`/digital/rank-tracking?gsc_error=${encodeURIComponent(error)}`)
  }

  if (!code || !clientId) {
    return res.redirect('/digital/rank-tracking?gsc_error=Missing+code+or+client')
  }

  const googleClientId     = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri        = `${appUrl}/api/gsc-callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     googleClientId,
        client_secret: googleClientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (tokens.error) throw new Error(tokens.error_description ?? tokens.error)

    // Get Google account email
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const user = await userRes.json()

    // Get list of Search Console sites this account has access to
    const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const sitesData = await sitesRes.json()
    const sites = (sitesData.siteEntry ?? []).map(s => s.siteUrl)

    // Store in Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    await supabase.from('digital_gsc_connections').upsert({
      client_id:     clientId,
      google_email:  user.email ?? null,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at:    tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      sites,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })

    return res.redirect(`/digital/rank-tracking?gsc_connected=1&client=${clientId}`)
  } catch (err) {
    console.error('[gsc-callback]', err)
    return res.redirect(`/digital/rank-tracking?gsc_error=${encodeURIComponent(err.message)}`)
  }
}
