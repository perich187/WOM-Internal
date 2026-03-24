/**
 * Initiates Google OAuth for Search Console access
 * GET /api/gsc-auth?clientId=<supabase-client-id>
 */
const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export default async function handler(req, res) {
  const { clientId } = req.query
  if (!clientId) return res.status(400).json({ error: 'clientId required' })

  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const appUrl = process.env.VITE_APP_URL || `https://${process.env.VERCEL_URL}`

  if (!googleClientId) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' })

  const params = new URLSearchParams({
    client_id:     googleClientId,
    redirect_uri:  `${appUrl}/api/gsc-callback`,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state:         clientId,
  })

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
