/**
 * WOM Site Audit — Job management (start + status combined)
 * POST /api/site-audit-job?action=start&url=...&clientId=...
 * GET  /api/site-audit-job?action=status&jobId=...
 */

import { createClient } from '@supabase/supabase-js'

const MAX_URLS = 150
const FETCH_TIMEOUT = 8000
const EXCLUDED_EXTENSIONS = /\.(css|js|jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|woff|woff2|ttf|eot|mp4|mp3|avi|mov|wmv|flv|swf|xml|json|txt|csv|doc|docx|xls|xlsx|ppt|pptx)$/i

function supabase() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WOMBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,*/*',
        ...(options.headers || {}),
      },
    })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    throw err
  }
}

function normaliseUrl(href, base) {
  try {
    const u = new URL(href, base)
    u.hash = ''
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1)
    u.searchParams.sort()
    return u.href
  } catch { return null }
}

function extractInternalLinks(html, baseUrl) {
  let baseHostname
  try { baseHostname = new URL(baseUrl).hostname } catch { return [] }
  const links = new Set()
  const hrefRegex = /href=["'](.*?)["']/gi
  let match
  while ((match = hrefRegex.exec(html)) !== null) {
    const raw = match[1].trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue
    const normalised = normaliseUrl(raw, baseUrl)
    if (!normalised) continue
    try {
      const parsed = new URL(normalised)
      if (parsed.hostname !== baseHostname) continue
      if (EXCLUDED_EXTENSIONS.test(parsed.pathname)) continue
      links.add(normalised)
    } catch { continue }
  }
  return Array.from(links)
}

async function followRedirects(url) {
  let current = url
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetchWithTimeout(current, { redirect: 'manual' })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) break
        current = new URL(loc, current).href
      } else break
    } catch { break }
  }
  return current
}

// ── START handler ────────────────────────────────────────────────────────────

async function handleStart(req, res) {
  let { url, clientId } = req.query
  if (!url) return res.status(400).json({ error: 'url required' })
  if (!url.startsWith('http')) url = `https://${url}`

  let baseUrl
  try {
    const u = new URL(url)
    baseUrl = `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}/`
  } catch { return res.status(400).json({ error: 'Invalid URL' }) }

  const resolvedBase = await followRedirects(baseUrl)

  let homepageHtml = ''
  try {
    const r = await fetchWithTimeout(resolvedBase, { redirect: 'follow' })
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('text/html') || ct.includes('xhtml')) homepageHtml = await r.text()
  } catch (err) {
    return res.status(502).json({ error: `Failed to fetch homepage: ${err.message}` })
  }

  const internalLinks = extractInternalLinks(homepageHtml, resolvedBase)
  const homepageNorm = normaliseUrl(resolvedBase, resolvedBase) || resolvedBase
  const allUrls = [homepageNorm]
  for (const link of internalLinks) {
    if (allUrls.length >= MAX_URLS) break
    if (!allUrls.includes(link)) allUrls.push(link)
  }

  const db = supabase()
  const jobData = { url: homepageNorm, status: 'pending', urls_to_crawl: allUrls, crawled_pages: [] }
  if (clientId) jobData.client_id = clientId

  const { data: job, error: dbErr } = await db.from('site_audit_jobs').insert(jobData).select('id').single()
  if (dbErr) return res.status(500).json({ error: `DB error: ${dbErr.message}` })

  return res.status(200).json({ jobId: job.id, urlCount: allUrls.length, urls: allUrls })
}

// ── STATUS handler ───────────────────────────────────────────────────────────

async function handleStatus(req, res) {
  const { jobId } = req.query
  if (!jobId) return res.status(400).json({ error: 'jobId required' })

  const db = supabase()
  const { data: job, error } = await db
    .from('site_audit_jobs')
    .select('id, status, urls_to_crawl, crawled_pages, result, error, created_at, updated_at')
    .eq('id', jobId)
    .single()

  if (error || !job) return res.status(404).json({ error: `Job not found: ${error?.message || 'unknown'}` })

  const response = {
    status: job.status,
    pagesAudited: (job.crawled_pages || []).length,
    totalUrls: (job.urls_to_crawl || []).length,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  }
  if (job.status === 'complete' && job.result) response.result = job.result
  if (job.status === 'failed' && job.error) response.error = job.error

  return res.status(200).json(response)
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action } = req.query
  if (action === 'start') return handleStart(req, res)
  if (action === 'status') return handleStatus(req, res)
  return res.status(400).json({ error: 'action must be start or status' })
}
