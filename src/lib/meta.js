/**
 * Initiates the Meta (Facebook + Instagram) OAuth 2.0 flow.
 * Redirects the user's browser to the Facebook consent screen.
 *
 * Required env vars:
 *   VITE_META_APP_ID  — your Meta App ID (safe to expose in frontend)
 *   VITE_APP_URL      — your deployed app URL, e.g. https://wom-internal.vercel.app
 */

const META_SCOPES = [
  'pages_show_list',           // list Pages the user manages
  'pages_manage_posts',        // publish posts to Facebook Pages
  'pages_read_engagement',     // read Page engagement data
  'read_insights',             // read Page Insights metrics (/{pageId}/insights)
  'instagram_basic',           // read Instagram account info
  'instagram_content_publish', // publish to Instagram
  'instagram_manage_insights', // read Instagram analytics
].join(',')

export function startMetaOAuth(clientId) {
  const appId  = import.meta.env.VITE_META_APP_ID
  const appUrl = import.meta.env.VITE_APP_URL

  if (!appId) {
    console.error('[meta] VITE_META_APP_ID is not set in .env.local')
    return false
  }
  if (!appUrl) {
    console.error('[meta] VITE_APP_URL is not set in .env.local')
    return false
  }

  // Encode client ID + nonce into state for CSRF protection and routing
  const state = btoa(JSON.stringify({
    clientId,
    nonce: Math.random().toString(36).slice(2),
  }))

  const params = new URLSearchParams({
    client_id:     appId,
    redirect_uri:  `${appUrl}/api/meta-oauth`,
    scope:         META_SCOPES,
    response_type: 'code',
    state,
  })

  window.location.href =
    `https://www.facebook.com/v19.0/dialog/oauth?${params}`

  return true
}

export function isMetaPlatform(platform) {
  return platform === 'facebook' || platform === 'instagram'
}
