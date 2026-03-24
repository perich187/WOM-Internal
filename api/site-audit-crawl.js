/**
 * WOM Site Audit — Crawl batch endpoint
 * POST /api/site-audit-crawl
 * Body: { jobId, urls: string[], depths?: number[] }
 * Processes up to 5 URLs per call, extracts per-page data, appends to Supabase job.
 */

import { createClient } from '@supabase/supabase-js'

const FETCH_TIMEOUT = 8000
const MAX_REDIRECTS = 5

const EXCLUDED_EXTENSIONS = /\.(css|js|jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|woff|woff2|ttf|eot|mp4|mp3|avi|mov|wmv|flv|swf|xml|json|txt|csv|doc|docx|xls|xlsx|ppt|pptx)$/i

function supabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchWithRedirects(url) {
  let currentUrl = url
  let redirectCount = 0
  const t0 = Date.now()

  while (redirectCount <= MAX_REDIRECTS) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    try {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WOMBot/1.0)',
          Accept: 'text/html,application/xhtml+xml,*/*',
        },
        redirect: 'manual',
      })
      clearTimeout(id)

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) {
          return { finalUrl: currentUrl, statusCode: res.status, html: '', redirectCount, responseTime: Date.now() - t0 }
        }
        redirectCount++
        currentUrl = new URL(location, currentUrl).href
        continue
      }

      const responseTime = Date.now() - t0
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
        return { finalUrl: currentUrl, statusCode: res.status, html: '', redirectCount, responseTime, nonHtml: true }
      }

      const html = await res.text()
      return { finalUrl: currentUrl, statusCode: res.status, html, redirectCount, responseTime }
    } catch (err) {
      clearTimeout(id)
      return {
        finalUrl: currentUrl,
        statusCode: 0,
        html: '',
        redirectCount,
        responseTime: Date.now() - t0,
        error: err.message,
      }
    }
  }

  return { finalUrl: currentUrl, statusCode: 0, html: '', redirectCount, responseTime: Date.now() - t0, error: 'Too many redirects' }
}

// ---------------------------------------------------------------------------
// HTML parsing helpers (regex only)
// ---------------------------------------------------------------------------

function stripTags(str) {
  if (!str) return ''
  return str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function extractTagContent(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = html.match(re)
  return m ? stripTags(m[1]).trim() : null
}

function extractAllTagContents(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  const results = []
  let m
  while ((m = re.exec(html)) !== null) {
    const text = stripTags(m[1]).trim()
    if (text) results.push(text)
  }
  return results
}

function extractMetaContent(html, name) {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*?)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+name=["']${name}["']`, 'i')
  const m = html.match(re) || html.match(re2)
  return m ? m[1].trim() : null
}

function extractCanonical(html) {
  const re = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*?)["']/i
  const re2 = /<link[^>]+href=["']([^"']*?)["'][^>]+rel=["']canonical["']/i
  const m = html.match(re) || html.match(re2)
  return m ? m[1].trim() : null
}

function extractHeadSection(html) {
  const m = html.match(/<head[\s\S]*?>([\s\S]*?)<\/head>/i)
  return m ? m[1] : ''
}

function countWordsInText(text) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return 0
  return clean.split(' ').filter(w => w.length > 0).length
}

function stripAllHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractOgTags(html) {
  const re = /<meta[^>]+property=["'](og:[^"']+)["'][^>]*>/gi
  const tags = []
  let m
  while ((m = re.exec(html)) !== null) {
    tags.push(m[1].toLowerCase())
  }
  return tags
}

function extractResources(html, baseUrl) {
  let baseHostname
  try {
    baseHostname = new URL(baseUrl).hostname
  } catch {
    return []
  }

  const resources = []

  // Images: <img src="...">
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi
  let m
  while ((m = imgRe.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl)
      if (u.hostname === baseHostname) {
        resources.push({ url: u.href, type: 'image' })
      }
    } catch {}
  }

  // CSS: <link rel="stylesheet" href="...">
  const cssRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi
  while ((m = cssRe.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl)
      if (u.hostname === baseHostname) {
        resources.push({ url: u.href, type: 'css' })
      }
    } catch {}
  }
  // Also catch href-first stylesheet links
  const cssRe2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi
  while ((m = cssRe2.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl)
      if (u.hostname === baseHostname) {
        resources.push({ url: u.href, type: 'css' })
      }
    } catch {}
  }

  // JS: <script src="...">
  const jsRe = /<script[^>]+src=["']([^"']+)["']/gi
  while ((m = jsRe.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl)
      if (u.hostname === baseHostname) {
        resources.push({ url: u.href, type: 'js' })
      }
    } catch {}
  }

  // Deduplicate
  const seen = new Set()
  return resources.filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

function extractLinks(html, baseUrl) {
  let baseHostname
  try {
    baseHostname = new URL(baseUrl).hostname
  } catch {
    return { internal: [], external: [] }
  }

  const internal = []
  const external = []
  const hrefRe = /<a[^>]+href=["']([^"']+)["']/gi
  let m
  const seenInternal = new Set()
  const seenExternal = new Set()

  while ((m = hrefRe.exec(html)) !== null) {
    const raw = m[1].trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue
    try {
      const u = new URL(raw, baseUrl)
      u.hash = ''
      if (u.hostname === baseHostname) {
        if (!EXCLUDED_EXTENSIONS.test(u.pathname) && !seenInternal.has(u.href)) {
          seenInternal.add(u.href)
          internal.push(u.href)
        }
      } else {
        if (!seenExternal.has(u.href)) {
          seenExternal.add(u.href)
          external.push(u.href)
        }
      }
    } catch {}
  }

  return { internal, external }
}

function avgSentenceLength(text) {
  if (!text) return 0
  const sentences = text.split(/\.\s+/).filter(s => s.trim().length > 0)
  if (sentences.length === 0) return 0
  const totalWords = sentences.reduce((sum, s) => sum + countWordsInText(s), 0)
  return Math.round(totalWords / sentences.length)
}

// ---------------------------------------------------------------------------
// Per-page extraction
// ---------------------------------------------------------------------------

function extractPageData(url, finalUrl, statusCode, redirectCount, responseTime, depth, html) {
  const headHtml = extractHeadSection(html)
  const visibleText = stripAllHtml(html)

  // Title
  const titleRaw = extractTagContent(headHtml, 'title') || extractTagContent(html, 'title')
  const title = titleRaw ? stripTags(titleRaw).trim() : ''

  // Description
  const description = extractMetaContent(html, 'description') || ''

  // H1s and H2s
  const h1s = extractAllTagContents(html, 'h1')
  const h2s = extractAllTagContents(html, 'h2')

  // Canonical
  const canonical = extractCanonical(html) || null

  // Robots
  const robots = extractMetaContent(html, 'robots') || null

  // OG tags
  const ogTags = extractOgTags(html)

  // Viewport
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html)

  // Charset
  const charset = /<meta[^>]+(charset=["']?[^"'\s>]+["']?|http-equiv=["']Content-Type["'])/i.test(html)

  // Doctype
  const doctype = /^\s*<!DOCTYPE\s+html/i.test(html)

  // Favicon
  const favicon = /<link[^>]+rel=["'][^"']*(?:icon|shortcut icon)[^"']*["']/i.test(headHtml) ||
    /<link[^>]+href=["'][^"']*favicon[^"']*["']/i.test(headHtml)

  // Schema
  const schema = /<script[^>]+type=["']application\/ld\+json["']/i.test(html)

  // Frames
  const hasFrames = /<(i?frame)\b/i.test(html)

  // Flash
  const hasFlash = /\.swf["'\s>?#]/i.test(html)

  // Lorem ipsum
  const hasLorem = /lorem\s+ipsum/i.test(visibleText)

  // Deprecated tags
  const deprecatedTagList = ['font', 'center', 'marquee', 'big', 'strike']
  const deprecatedTags = deprecatedTagList.filter(tag => new RegExp(`<${tag}[\\s>]`, 'i').test(html))

  // Word/char count
  const wordCount = countWordsInText(visibleText)
  const charCount = visibleText.length

  // HTTP links (not https)
  const httpLinksMatch = html.match(/href=["']http:\/\//gi) || []
  const httpLinks = httpLinksMatch.length

  // Link count
  const linkCountMatch = html.match(/<a\s/gi) || []
  const linkCount = linkCountMatch.length

  // Links
  const { internal: internalLinks, external: externalLinks } = extractLinks(html, finalUrl)

  // Resources
  const resources = extractResources(html, finalUrl)

  // Average sentence length
  const avgSentenceLen = avgSentenceLength(visibleText)

  // Scripts in head
  const headScriptsMatch = headHtml.match(/<script\s/gi) || []
  const headScripts = headScriptsMatch.length

  // HTML size in bytes
  const htmlSize = Buffer.byteLength(html, 'utf8')

  return {
    url: finalUrl,
    originalUrl: url,
    statusCode,
    redirectCount,
    responseTime,
    depth,
    htmlSize,
    title,
    description,
    h1s,
    h2s,
    canonical,
    robots,
    ogTags,
    viewport,
    charset,
    doctype,
    favicon,
    schema,
    hasFrames,
    hasFlash,
    hasLorem,
    deprecatedTags,
    wordCount,
    charCount,
    httpLinks,
    linkCount,
    internalLinks,
    externalLinks,
    resources,
    avgSentenceLen,
    headScripts,
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  const { jobId, urls, depths } = body || {}
  if (!jobId) return res.status(400).json({ error: 'jobId required' })
  if (!urls || !Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'urls array required' })

  const db = supabase()
  const newPages = []

  for (let i = 0; i < Math.min(urls.length, 5); i++) {
    const url = urls[i]
    const depth = (depths && depths[i] !== undefined) ? depths[i] : 1

    const { finalUrl, statusCode, html, redirectCount, responseTime } = await fetchWithRedirects(url)

    if (html && html.length > 0) {
      const pageData = extractPageData(url, finalUrl, statusCode, redirectCount, responseTime, depth, html)
      newPages.push(pageData)
    } else {
      // Non-HTML or error — store minimal record
      newPages.push({
        url: finalUrl,
        originalUrl: url,
        statusCode,
        redirectCount,
        responseTime,
        depth,
        htmlSize: 0,
        title: '',
        description: '',
        h1s: [],
        h2s: [],
        canonical: null,
        robots: null,
        ogTags: [],
        viewport: false,
        charset: false,
        doctype: false,
        favicon: false,
        schema: false,
        hasFrames: false,
        hasFlash: false,
        hasLorem: false,
        deprecatedTags: [],
        wordCount: 0,
        charCount: 0,
        httpLinks: 0,
        linkCount: 0,
        internalLinks: [],
        externalLinks: [],
        resources: [],
        avgSentenceLen: 0,
        headScripts: 0,
      })
    }
  }

  // Read current crawled_pages, append new ones, write back
  const { data: job, error: readErr } = await db
    .from('site_audit_jobs')
    .select('crawled_pages')
    .eq('id', jobId)
    .single()

  if (readErr) {
    return res.status(500).json({ error: `DB read error: ${readErr.message}` })
  }

  const updated = [...(job.crawled_pages || []), ...newPages]

  const { error: writeErr } = await db
    .from('site_audit_jobs')
    .update({
      crawled_pages: updated,
      status: 'crawling',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (writeErr) {
    return res.status(500).json({ error: `DB write error: ${writeErr.message}` })
  }

  return res.status(200).json({
    success: true,
    processed: newPages.length,
    jobId,
  })
}
