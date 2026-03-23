/**
 * Vercel serverless function — Meta OAuth 2.0 callback handler.
 *
 * Flow:
 *   1. Facebook redirects here with ?code=...&state=...
 *   2. We exchange the code for a short-lived user token
 *   3. We exchange that for a long-lived token (60 days)
 *   4. We fetch the user's managed Facebook Pages
 *   5. For each Page, we check for a linked Instagram Business account
 *   6. We upsert everything into Supabase social_accounts
 *   7. We redirect back to /accounts?connected=meta
 */

import { createClient } from '@supabase/supabase-js'

// Accept either META_APP_ID or VITE_META_APP_ID (both work in serverless functions)
const APP_ID      = process.env.META_APP_ID || process.env.VITE_META_APP_ID
const APP_SECRET  = process.env.META_APP_SECRET
// APP_URL is your Vercel deployment URL, e.g. https://wom-internal.vercel.app
const APP_URL     = process.env.VITE_APP_URL || `https://${process.env.VERCEL_URL}`
const REDIRECT_URI = `${APP_URL}/api/meta-oauth`
const GRAPH       = 'https://graph.facebook.com/v19.0'

export default async function handler(req, res) {
  // Guard: fail fast if env vars are missing
  if (!APP_ID || !APP_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[meta-oauth] Missing env vars:', {
      APP_ID: !!APP_ID,
      APP_SECRET: !!APP_SECRET,
      SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    })
    return res.redirect('/accounts?error=Server+configuration+error+-+check+Vercel+env+vars')
  }

  const { code, state, error: fbError, error_description } = req.query

  // User denied permissions on Facebook
  if (fbError) {
    return res.redirect(
      `/accounts?error=${encodeURIComponent(error_description || fbError)}`
    )
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

  if (!clientId) {
    return res.status(400).send('No client ID found in state.')
  }

  // ── Step 1: Exchange code → short-lived user token ────────────
  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`)
  tokenUrl.searchParams.set('client_id',     APP_ID)
  tokenUrl.searchParams.set('client_secret', APP_SECRET)
  tokenUrl.searchParams.set('redirect_uri',  REDIRECT_URI)
  tokenUrl.searchParams.set('code',          code)

  const tokenRes  = await fetch(tokenUrl)
  const tokenData = await tokenRes.json()

  if (tokenData.error) {
    console.error('[meta-oauth] token exchange error:', tokenData.error)
    return res.redirect(
      `/accounts?error=${encodeURIComponent(tokenData.error.message)}`
    )
  }

  // ── Step 2: Exchange → long-lived user token (60 days) ────────
  const llUrl = new URL(`${GRAPH}/oauth/access_token`)
  llUrl.searchParams.set('grant_type',       'fb_exchange_token')
  llUrl.searchParams.set('client_id',        APP_ID)
  llUrl.searchParams.set('client_secret',    APP_SECRET)
  llUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

  const llRes  = await fetch(llUrl)
  const llData = await llRes.json()

  if (llData.error) {
    return res.redirect(
      `/accounts?error=${encodeURIComponent(llData.error.message)}`
    )
  }

  const userToken = llData.access_token

  // ── Step 3: Get managed Facebook Pages ───────────────────────
  const pagesRes  = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`
  )
  const pagesData = await pagesRes.json()

  if (pagesData.error) {
    return res.redirect(
      `/accounts?error=${encodeURIComponent(pagesData.error.message)}`
    )
  }

  // ── Step 4: Build upsert records ─────────────────────────────
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const upserts = []

  for (const page of (pagesData.data ?? [])) {
    // Facebook Page — page access tokens don't expire when generated
    // from a long-lived user token.
    upserts.push({
      client_id:        clientId,
      platform:         'facebook',
      account_name:     page.name,
      platform_user_id: page.id,
      access_token:     page.access_token,
      connected:        true,
      updated_at:       new Date().toISOString(),
    })

    // Instagram Business account linked to this Page
    if (page.instagram_business_account?.id) {
      const igRes  = await fetch(
        `${GRAPH}/${page.instagram_business_account.id}?fields=id,username,followers_count&access_token=${page.access_token}`
      )
      const igData = await igRes.json()

      if (!igData.error) {
        upserts.push({
          client_id:        clientId,
          platform:         'instagram',
          username:         igData.username ?? null,
          account_name:     igData.username ?? page.name,
          platform_user_id: igData.id,
          followers:        igData.followers_count ?? 0,
          access_token:     page.access_token, // IG uses the Page's access token
          connected:        true,
          updated_at:       new Date().toISOString(),
        })
      }
    }
  }

  // ── Step 5: Save to Supabase ──────────────────────────────────
  if (upserts.length > 0) {
    const { error: dbError } = await supabase
      .from('social_accounts')
      .upsert(upserts, { onConflict: 'client_id,platform' })

    if (dbError) {
      console.error('[meta-oauth] supabase upsert error:', dbError)
      return res.redirect(
        `/accounts?error=${encodeURIComponent('Database error: ' + dbError.message)}`
      )
    }
  }

  // ── Done — redirect back to app ───────────────────────────────
  return res.redirect(
    `/accounts?connected=meta&count=${upserts.length}&client=${clientId}`
  )
}
