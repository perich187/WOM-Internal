/**
 * Vercel serverless function — Meta User Data Deletion Callback.
 *
 * Meta sends a POST with a signed_request when a user requests
 * their data be deleted from your app via Facebook Settings.
 *
 * We verify the signature, delete their connected accounts from
 * Supabase, and return a confirmation JSON response.
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const signed_request = req.body?.signed_request

  if (!signed_request) {
    return res.status(400).json({ error: 'Missing signed_request' })
  }

  const APP_SECRET = process.env.META_APP_SECRET
  const APP_URL    = process.env.VITE_APP_URL || `https://${process.env.VERCEL_URL}`

  // ── Verify Meta's signature ───────────────────────────────────
  const [encodedSig, encodedPayload] = signed_request.split('.')

  const expectedSig = crypto
    .createHmac('sha256', APP_SECRET)
    .update(encodedPayload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  if (encodedSig !== expectedSig) {
    return res.status(400).json({ error: 'Invalid signature' })
  }

  // ── Decode payload ────────────────────────────────────────────
  let payload
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    )
  } catch {
    return res.status(400).json({ error: 'Invalid payload' })
  }

  const facebookUserId = payload.user_id

  // ── Delete data from Supabase ─────────────────────────────────
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Remove any Facebook/Instagram accounts connected with this FB user ID
  await supabase
    .from('social_accounts')
    .delete()
    .eq('platform_user_id', facebookUserId)

  // ── Return confirmation to Meta ───────────────────────────────
  const confirmationCode = crypto.randomBytes(12).toString('hex')

  return res.status(200).json({
    url:               `${APP_URL}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  })
}
