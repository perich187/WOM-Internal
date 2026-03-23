/**
 * Vercel serverless function — Meta OAuth 2.0 callback handler.
 *
 * Flow:
 *   1. Facebook redirects here with ?code=...&state=...
 *   2. Exchange code for long-lived user token
 *   3. Fetch all Facebook Pages the user manages + linked Instagram accounts
 *   4. Save the found pages to meta_oauth_pending (temp table)
 *   5. Redirect to /accounts?session=<id>&client=<clientId>
 *      → The UI shows a "Select which Page belongs to this client" modal
 *      → User picks one → saved to social_accounts
 *
 * This approach lets one agency staff member manage multiple client Pages
 * without accidentally linking the wrong Page to the wrong client.
 */

import { createClient } from '@supabase/supabase-js'

const APP_ID       = process.env.META_APP_ID || process.env.VITE_META_APP_ID
const APP_SECRET   = process.env.META_APP_SECRET
const APP_URL      = process.env.VITE_APP_URL || `https://${process.env.VERCEL_URL}`
const REDIRECT_URI = `${APP_URL}/api/meta-oauth`
const GRAPH        = 'https://graph.facebook.com/v19.0'

export default async function handler(req, res) {
  if (!APP_ID || !APP_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[meta-oauth] Missing env vars')
    return res.redirect('/accounts?error=Server+configuration+error')
  }

  const { code, state, error: fbError, error_description } = req.query

  if (fbError) {
    return res.redirect(`/accounts?error=${encodeURIComponent(error_description || fbError)}`)
  }

  if (!code || !state) {
    return res.status(400).send('Missing authorization code or state.')
  }

  // ── Parse state ───────────────────────────────────────────────
  let clientId
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'))
    clientId = decoded.clientId
  } catch {
    return res.status(400).send('Invalid state parameter.')
  }
  if (!clientId) return res.status(400).send('No client ID in state.')

  // ── Exchange code → short-lived token ────────────────────────
  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`)
  tokenUrl.searchParams.set('client_id',     APP_ID)
  tokenUrl.searchParams.set('client_secret', APP_SECRET)
  tokenUrl.searchParams.set('redirect_uri',  REDIRECT_URI)
  tokenUrl.searchParams.set('code',          code)

  const tokenData = await fetch(tokenUrl).then(r => r.json())
  if (tokenData.error) {
    console.error('[meta-oauth] token error:', tokenData.error)
    return res.redirect(`/accounts?error=${encodeURIComponent(tokenData.error.message)}`)
  }

  // ── Exchange → long-lived token (60 days) ────────────────────
  const llUrl = new URL(`${GRAPH}/oauth/access_token`)
  llUrl.searchParams.set('grant_type',        'fb_exchange_token')
  llUrl.searchParams.set('client_id',         APP_ID)
  llUrl.searchParams.set('client_secret',     APP_SECRET)
  llUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

  const llData = await fetch(llUrl).then(r => r.json())
  if (llData.error) {
    return res.redirect(`/accounts?error=${encodeURIComponent(llData.error.message)}`)
  }

  const userToken = llData.access_token

  // ── Fetch managed Facebook Pages ─────────────────────────────
  const pagesData = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`
  ).then(r => r.json())

  console.log('[meta-oauth] pages:', JSON.stringify(pagesData))

  if (pagesData.error) {
    return res.redirect(`/accounts?error=${encodeURIComponent(pagesData.error.message)}`)
  }

  const pages = pagesData.data ?? []

  if (pages.length === 0) {
    return res.redirect(`/accounts?error=${encodeURIComponent(
      'No Facebook Pages found. Make sure you are an Admin of a Facebook Page and granted all requested permissions.'
    )}`)
  }

  // ── Build pending page list (safe to store — tokens are per-page) ─
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const pendingPages = []

  for (const page of pages) {
    const entry = {
      fb_page_id:    page.id,
      fb_page_name:  page.name,
      fb_token:      page.access_token,
      ig_user_id:    null,
      ig_username:   null,
      ig_followers:  0,
    }

    // Fetch linked Instagram Business account
    if (page.instagram_business_account?.id) {
      const igData = await fetch(
        `${GRAPH}/${page.instagram_business_account.id}?fields=id,username,followers_count&access_token=${page.access_token}`
      ).then(r => r.json())

      if (!igData.error) {
        entry.ig_user_id   = igData.id
        entry.ig_username  = igData.username ?? null
        entry.ig_followers = igData.followers_count ?? 0
      }
    }

    pendingPages.push(entry)
  }

  // ── Save to pending table ─────────────────────────────────────
  const { data: session, error: dbErr } = await supabase
    .from('meta_oauth_pending')
    .insert({ client_id: clientId, pages: pendingPages })
    .select('id')
    .single()

  if (dbErr) {
    console.error('[meta-oauth] pending insert error:', JSON.stringify(dbErr))
    return res.redirect(`/accounts?error=${encodeURIComponent('Database error: ' + dbErr.message)}`)
  }

  // ── Redirect to page selection UI ────────────────────────────
  return res.redirect(
    `/accounts?session=${session.id}&client=${clientId}`
  )
}
