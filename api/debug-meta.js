/**
 * Diagnostic endpoint — checks all required env vars are set.
 * Visit: https://your-app.vercel.app/api/debug-meta
 * Safe to expose: only shows whether vars are set, never the values.
 */
export default async function handler(req, res) {
  const appId     = process.env.META_APP_ID || process.env.VITE_META_APP_ID
  const appUrl    = process.env.VITE_APP_URL || `https://${process.env.VERCEL_URL}`

  return res.status(200).json({
    env: {
      META_APP_ID:              appId ? `set (${appId})` : 'MISSING',
      META_APP_SECRET:          process.env.META_APP_SECRET          ? 'set ✓' : 'MISSING ✗',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set ✓' : 'MISSING ✗',
      VITE_SUPABASE_URL:        process.env.VITE_SUPABASE_URL        ? process.env.VITE_SUPABASE_URL : 'MISSING ✗',
      VITE_APP_URL:             appUrl,
    },
    redirect_uri: `${appUrl}/api/meta-oauth`,
    note: 'The redirect_uri above must exactly match what is registered in Meta → Facebook Login → Valid OAuth Redirect URIs',
  })
}
