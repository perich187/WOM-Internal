/**
 * WOM Site Audit — Start endpoint
 * POST /api/site-audit-start?url=...&clientId=...
 * Discovers all internal URLs and creates a Supabase job record.
 */

import { createClient } from '@supabase/supabase-js'

const MAX_URLS = 150
const FETCH_TIMEOUT = 8000

const EXCLUDED_EXTENSIONS = /\.(css|js|jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|woff|woff2|ttf|eot|mp4|mp3|avi|mov|wmv|flv|swf|xml|json|txt|csv|doc|docx|xls|xlsx|ppt|pptx)$/i

function supabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
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
    // Strip fragment
    u.hash = ''
    // Remove trailing slash from path (but not root)
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1)
    }
    // Sort query params for deduplication
    u.searchParams.sort()
    return u.href
  } catch {
    return null
  }
}

function extractInternalLinks(html, baseUrl) {
  let baseHostname
  try {
    baseHostname = new URL(baseUrl).hostname
  } catch {
    return []
  }

  const links = new Set()
  const hrefRegex = /href=["'](.*?)["']/gi
  let match

  while ((match = hrefRegex.exec(html)) !== null) {
    const raw = match[1].trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) {
      continue
    }

    const normalised = normaliseUrl(raw, baseUrl)
    if (!normalised) continue

    let parsed
    try {
      parsed = new URL(normalised)
    } catch {
      continue
    }

    // Same hostname only
    if (parsed.hostname !== baseHostname) continue

    // Exclude asset extensions
    if (EXCLUDED_EXTENSIONS.test(parsed.pathname)) continue

    links.add(normalised)
  }

  return Array.from(links)
}

async function followRedirectsToFinalUrl(url) {
  let current = url
  let hops = 0
  const maxHops = 5
  while (hops < maxHops) {
    try {
      const res = await fetchWithTimeout(current, { redirect: 'manual' })
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) break
        current = new URL(location, current).href
        hops++
        continue
      }
      return current
    } catch {
      return current
    }
  }
  return current
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let { url, clientId } = req.query
  if (!url) return res.status(400).json({ error: 'url required' })
  if (!url.startsWith('http')) url = `https://${url}`

  // Normalise base URL
  let baseUrl
  try {
    const u = new URL(url)
    baseUrl = `${u.protocol}//${u.hostname}`
    if (u.port) baseUrl += `:${u.port}`
    baseUrl += '/'
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  // Follow any redirects on the homepage to get canonical base
  const resolvedBase = await followRedirectsToFinalUrl(baseUrl)

  // Fetch homepage HTML
  let homepageHtml = ''
  try {
    const r = await fetchWithTimeout(resolvedBase, { redirect: 'follow' })
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('text/html') || ct.includes('xhtml')) {
      homepageHtml = await r.text()
    }
  } catch (err) {
    return res.status(502).json({ error: `Failed to fetch homepage: ${err.message}` })
  }

  // Extract internal links from homepage
  const internalLinks = extractInternalLinks(homepageHtml, resolvedBase)

  // Build URL list: homepage first, then discovered links
  const homepageNormalised = normaliseUrl(resolvedBase, resolvedBase) || resolvedBase
  const allUrls = [homepageNormalised]

  for (const link of internalLinks) {
    if (allUrls.length >= MAX_URLS) break
    if (!allUrls.includes(link)) {
      allUrls.push(link)
    }
  }

  // Create Supabase job
  const db = supabase()
  const jobData = {
    url: homepageNormalised,
    status: 'pending',
    urls_to_crawl: allUrls,
    crawled_pages: [],
  }
  if (clientId) jobData.client_id = clientId

  const { data: job, error: dbErr } = await db
    .from('site_audit_jobs')
    .insert(jobData)
    .select('id')
    .single()

  if (dbErr) {
    return res.status(500).json({ error: `DB error: ${dbErr.message}` })
  }

  return res.status(200).json({
    jobId: job.id,
    urlCount: allUrls.length,
    urls: allUrls,
  })
}
