/**
 * GET /api/cron-publish
 *
 * Vercel Cron Job — runs every 5 minutes (configure in vercel.json).
 * Finds all scheduled posts that are due and publishes them.
 *
 * Vercel automatically sends Authorization: Bearer {CRON_SECRET} with cron requests.
 * Set CRON_SECRET in Vercel env vars (Vercel generates one automatically, or set your own).
 *
 * NOTE: Cron jobs every 5 minutes require Vercel Pro.
 *       On the Hobby plan, change the schedule to "0 * * * *" (every hour).
 */

import { createClient } from '@supabase/supabase-js'
import { publishPost } from './_publish.js'

export default async function handler(req, res) {
  // Verify request is from Vercel cron (or an authorised internal caller)
  const authHeader   = req.headers['authorization'] ?? ''
  const cronSecret   = process.env.CRON_SECRET
  const internalKey  = process.env.INTERNAL_API_KEY

  const fromVercelCron    = cronSecret   && authHeader === `Bearer ${cronSecret}`
  const fromInternalCaller = internalKey && req.headers['x-internal-key'] === internalKey

  if (!fromVercelCron && !fromInternalCaller) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // Find posts scheduled for now or earlier that haven't been published yet
  const { data: posts, error } = await db
    .from('social_posts')
    .select('id, client_id, platforms')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(20) // process up to 20 per run to stay within serverless timeout

  if (error) {
    console.error('[cron-publish] DB error:', error.message)
    return res.status(500).json({ error: error.message })
  }

  if (!posts || posts.length === 0) {
    return res.status(200).json({ ok: true, processed: 0, message: 'No posts due.' })
  }

  console.log(`[cron-publish] Processing ${posts.length} post(s)`)

  const results = []
  for (const post of posts) {
    try {
      const result = await publishPost(post.id)
      results.push({ id: post.id, ok: true, ...result })
    } catch (err) {
      console.error(`[cron-publish] Failed post ${post.id}:`, err.message)
      results.push({ id: post.id, ok: false, error: err.message })

      // Mark as failed in DB so it doesn't get retried indefinitely
      await db
        .from('social_posts')
        .update({ status: 'failed', error_message: err.message, updated_at: new Date().toISOString() })
        .eq('id', post.id)
    }
  }

  return res.status(200).json({
    ok:        true,
    processed: results.length,
    results,
  })
}
