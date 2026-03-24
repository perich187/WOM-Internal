/**
 * WOM Site Audit — Status endpoint
 * GET /api/site-audit-status?jobId=...
 * Returns current job status, progress counters, and final result when complete.
 */

import { createClient } from '@supabase/supabase-js'

function supabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { jobId } = req.query
  if (!jobId) return res.status(400).json({ error: 'jobId required' })

  const db = supabase()

  const { data: job, error } = await db
    .from('site_audit_jobs')
    .select('id, status, urls_to_crawl, crawled_pages, result, error, created_at, updated_at')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    return res.status(404).json({ error: `Job not found: ${error?.message || 'unknown'}` })
  }

  const totalUrls = (job.urls_to_crawl || []).length
  const pagesAudited = (job.crawled_pages || []).length

  const response = {
    status: job.status,
    pagesAudited,
    totalUrls,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  }

  if (job.status === 'complete' && job.result) {
    response.result = job.result
  }

  if (job.status === 'failed' && job.error) {
    response.error = job.error
  }

  return res.status(200).json(response)
}
