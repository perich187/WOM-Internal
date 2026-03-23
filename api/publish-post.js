/**
 * POST /api/publish-post?postId=<uuid>
 *
 * Triggered by the "Publish Now" button in the UI, or can be called
 * manually to retry a failed post.
 *
 * Protected by a simple internal key so it can't be called by random visitors.
 * Set INTERNAL_API_KEY in Vercel env vars (any random string works).
 */

import { publishPost } from './_publish.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Simple auth — frontend passes the same key we set in Vercel env
  const expectedKey = process.env.INTERNAL_API_KEY
  if (expectedKey && req.headers['x-internal-key'] !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const postId = req.query.postId || req.body?.postId
  if (!postId) {
    return res.status(400).json({ error: 'Missing postId' })
  }

  try {
    const result = await publishPost(postId)
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    console.error('[publish-post] error:', err.message)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
