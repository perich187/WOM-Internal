/**
 * WOM Site Audit — Unified endpoint (merged from site-audit-job, site-audit-crawl, site-audit-finalize)
 *
 * POST /api/site-audit?action=start&url=...&clientId=...
 * GET  /api/site-audit?action=status&jobId=...
 * POST /api/site-audit?action=crawl         body: { jobId, urls, depths }
 * POST /api/site-audit?action=finalize&jobId=...
 */

import { createClient } from '@supabase/supabase-js'

// ── Shared helpers ────────────────────────────────────────────────────────────

const MAX_URLS              = 150
const FETCH_TIMEOUT         = 8000
const MAX_REDIRECTS         = 5
const HEAD_TIMEOUT          = 8000
const MAX_RESOURCES_TO_CHECK = 50

const EXCLUDED_EXTENSIONS = /\.(css|js|jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|woff|woff2|ttf|eot|mp4|mp3|avi|mov|wmv|flv|swf|xml|json|txt|csv|doc|docx|xls|xlsx|ppt|pptx)$/i

function supabase() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// ── START helpers (from site-audit-job) ──────────────────────────────────────

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
      if (parsed.pathname.startsWith('/cdn-cgi/')) continue
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

// ── CRAWL helpers (from site-audit-crawl) ────────────────────────────────────

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
      return { finalUrl: currentUrl, statusCode: 0, html: '', redirectCount, responseTime: Date.now() - t0, error: err.message }
    }
  }

  return { finalUrl: currentUrl, statusCode: 0, html: '', redirectCount, responseTime: Date.now() - t0, error: 'Too many redirects' }
}

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
  while ((m = re.exec(html)) !== null) tags.push(m[1].toLowerCase())
  return tags
}

function extractResources(html, baseUrl) {
  let baseHostname
  try { baseHostname = new URL(baseUrl).hostname } catch { return [] }
  const resources = []
  let m

  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi
  while ((m = imgRe.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl)
      if (u.hostname === baseHostname) resources.push({ url: u.href, type: 'image' })
    } catch {}
  }

  const cssRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi
  while ((m = cssRe.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl)
      if (u.hostname === baseHostname) resources.push({ url: u.href, type: 'css' })
    } catch {}
  }
  const cssRe2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi
  while ((m = cssRe2.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl)
      if (u.hostname === baseHostname) resources.push({ url: u.href, type: 'css' })
    } catch {}
  }

  const jsRe = /<script[^>]+src=["']([^"']+)["']/gi
  while ((m = jsRe.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl)
      if (u.hostname === baseHostname) resources.push({ url: u.href, type: 'js' })
    } catch {}
  }

  const seen = new Set()
  return resources.filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

function extractLinks(html, baseUrl) {
  let baseHostname
  try { baseHostname = new URL(baseUrl).hostname } catch { return { internal: [], external: [] } }

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

function extractPageData(url, finalUrl, statusCode, redirectCount, responseTime, depth, html) {
  const headHtml = extractHeadSection(html)
  const visibleText = stripAllHtml(html)

  const titleRaw = extractTagContent(headHtml, 'title') || extractTagContent(html, 'title')
  const title = titleRaw ? stripTags(titleRaw).trim() : ''
  const description = extractMetaContent(html, 'description') || ''
  const h1s = extractAllTagContents(html, 'h1')
  const h2s = extractAllTagContents(html, 'h2')
  const canonical = extractCanonical(html) || null
  const robots = extractMetaContent(html, 'robots') || null
  const ogTags = extractOgTags(html)
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html)
  const charset = /<meta[^>]+(charset=["']?[^"'\s>]+["']?|http-equiv=["']Content-Type["'])/i.test(html)
  const doctype = /^\s*<!DOCTYPE\s+html/i.test(html)
  const favicon = /<link[^>]+rel=["'][^"']*(?:icon|shortcut icon)[^"']*["']/i.test(headHtml) ||
    /<link[^>]+href=["'][^"']*favicon[^"']*["']/i.test(headHtml)
  const schema = /<script[^>]+type=["']application\/ld\+json["']/i.test(html)
  const hasFrames = /<(i?frame)\b/i.test(html)
  const hasFlash = /\.swf["'\s>?#]/i.test(html)
  const hasLorem = /lorem\s+ipsum/i.test(visibleText)
  const deprecatedTagList = ['font', 'center', 'marquee', 'big', 'strike']
  const deprecatedTags = deprecatedTagList.filter(tag => new RegExp(`<${tag}[\\s>]`, 'i').test(html))
  const wordCount = countWordsInText(visibleText)
  const charCount = visibleText.length
  const httpLinksMatch = html.match(/href=["']http:\/\//gi) || []
  const httpLinks = httpLinksMatch.length
  const linkCountMatch = html.match(/<a\s/gi) || []
  const linkCount = linkCountMatch.length
  const { internal: internalLinks, external: externalLinks } = extractLinks(html, finalUrl)
  const resources = extractResources(html, finalUrl)
  const avgSentenceLen = avgSentenceLength(visibleText)
  const headScriptsMatch = headHtml.match(/<script\s/gi) || []
  const headScripts = headScriptsMatch.length
  const htmlSize = Buffer.byteLength(html, 'utf8')

  return {
    url: finalUrl, originalUrl: url, statusCode, redirectCount, responseTime, depth, htmlSize,
    title, description, h1s, h2s, canonical, robots, ogTags, viewport, charset, doctype,
    favicon, schema, hasFrames, hasFlash, hasLorem, deprecatedTags, wordCount, charCount,
    httpLinks, linkCount, internalLinks, externalLinks, resources, avgSentenceLen, headScripts,
  }
}

// ── FINALIZE helpers (from site-audit-finalize) ───────────────────────────────

async function headRequest(url) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), HEAD_TIMEOUT)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WOMBot/1.0)' },
      redirect: 'manual',
    })
    clearTimeout(id)
    return { status: res.status }
  } catch {
    clearTimeout(id)
    return { status: 0 }
  }
}

const TEST_DEFS = [
  { id: '4xx_errors',             label: '4XX Errors',                                    severity: 'critical', description: 'Pages returning 4XX status codes (e.g. 404 Not Found). These pages are inaccessible to users and search engines.' },
  { id: 'duplicate_content',      label: 'Duplicate Content',                             severity: 'error',    description: 'Pages with near-identical content. Search engines may penalise or devalue duplicate content.' },
  { id: 'duplicate_titles',       label: 'Duplicate Titles',                              severity: 'error',    description: 'Multiple pages share the same title tag. Each page should have a unique, descriptive title.' },
  { id: 'broken_links',           label: 'Broken Links',                                  severity: 'error',    description: 'Internal links pointing to pages that return 4XX errors. Broken links hurt user experience and crawlability.' },
  { id: 'broken_resources',       label: 'Broken Resources',                              severity: 'error',    description: 'Images, stylesheets, or scripts that fail to load (4XX/5XX). This affects page appearance and performance.' },
  { id: 'duplicate_descriptions', label: 'Duplicate Descriptions',                        severity: 'error',    description: 'Multiple pages share the same meta description. Unique descriptions help click-through rates in search results.' },
  { id: 'not_canonical',          label: 'Page is not Canonical',                         severity: 'error',    description: 'Pages missing a canonical tag. Canonical tags prevent duplicate content issues by specifying the preferred URL.' },
  { id: 'redirect_chain',         label: 'Page contains a redirect chain',                severity: 'error',    description: 'Pages reached through 2 or more redirects. Redirect chains slow page load and dilute link equity.' },
  { id: 'canonical_chain',        label: 'Canonical Chain',                               severity: 'error',    description: 'Canonical tags pointing to pages that themselves have a different canonical. This creates a chain that confuses search engines.' },
  { id: 'meta_robots_blocking',   label: 'Meta Robots Blocking Crawlers',                 severity: 'warning',  description: 'Pages with noindex or nofollow in meta robots. These pages will not be indexed by search engines.' },
  { id: 'short_title',            label: 'Short Title',                                   severity: 'warning',  description: 'Title tags under 20 characters. Short titles may not accurately describe page content.' },
  { id: 'long_title',             label: 'Long Title',                                    severity: 'warning',  description: 'Title tags over 60 characters. Long titles are truncated in search results.' },
  { id: 'missing_h1',             label: 'Missing H1',                                    severity: 'warning',  description: 'Pages with no H1 tag. H1 tags are important for SEO and accessibility.' },
  { id: 'missing_meta_description', label: 'Missing Meta Description',                    severity: 'warning',  description: 'Pages without a meta description. Descriptions appear in search results and affect click-through rates.' },
  { id: 'redirect_links',         label: 'Redirect Links',                                severity: 'warning',  description: 'Internal links pointing to URLs that redirect. Update these to point directly to the final URL.' },
  { id: 'missing_alt',            label: 'Missing Alt Attributes',                        severity: 'warning',  description: 'Images without alt text. Alt text is essential for accessibility and image SEO.' },
  { id: 'slow_page_load',         label: 'Slow Page Load',                                severity: 'warning',  description: 'Pages taking over 3 seconds to respond. Slow pages hurt user experience and SEO rankings.' },
  { id: 'encoding_not_declared',  label: 'Encoding not Declared',                         severity: 'warning',  description: 'Pages without a charset declaration. Without this, browsers may misinterpret character encoding.' },
  { id: 'low_word_count',         label: 'Low Word Count',                                severity: 'warning',  description: 'Pages with under 100 words of content. Thin content may be seen as low quality by search engines.' },
  { id: 'frames_used',            label: 'Frames Used',                                   severity: 'warning',  description: 'Pages using iframe or frame elements. Framed content is difficult for search engines to index correctly.' },
  { id: 'high_waiting_time',      label: 'High Waiting Time',                             severity: 'warning',  description: 'Pages with server response time over 2 seconds. High TTFB indicates server performance issues.' },
  { id: 'http_links',             label: 'Page contains HTTP links',                      severity: 'warning',  description: 'Pages containing links that use HTTP instead of HTTPS. These should be updated to use secure URLs.' },
  { id: 'orphan_pages',           label: 'Page does not have internal links pointing to it', severity: 'warning', description: 'Pages with no internal links pointing to them. Orphan pages are hard for search engines to discover.' },
  { id: 'duplicate_meta_tags',    label: 'Duplicate Meta Tags',                           severity: 'warning',  description: 'Pages with duplicate OG or meta tags. Duplicate tags can cause incorrect previews on social media.' },
  { id: 'seo_unfriendly_url',     label: 'SEO Friendly URL',                              severity: 'warning',  description: 'URLs containing underscores, uppercase letters, or unnecessary query parameters.' },
  { id: 'low_content_rate',       label: 'Low Content Rate',                              severity: 'warning',  description: 'Pages where the ratio of content to HTML is very low (under 50 words).' },
  { id: '5xx_errors',             label: '5XX Errors',                                    severity: 'error',    description: 'Pages returning server error codes (500+). These indicate server-side problems.' },
  { id: 'missing_title',          label: 'Missing Title',                                 severity: 'error',    description: 'Pages with no title tag at all. Title tags are critical for SEO.' },
  { id: 'large_page_size',        label: 'Large Page Size',                               severity: 'warning',  description: 'Pages with HTML size over 3MB. Large pages slow down load times.' },
  { id: 'too_many_links',         label: 'Too Many On-Page Links',                        severity: 'warning',  description: 'Pages with over 150 links. Too many links dilute link equity and may look spammy.' },
  { id: 'doctype_missing',        label: 'Doctype not Declared',                          severity: 'warning',  description: 'Pages missing the <!DOCTYPE html> declaration. Without this, browsers enter quirks mode.' },
  { id: 'flash_used',             label: 'Flash Content Used',                            severity: 'warning',  description: 'Pages referencing Flash (.swf) content. Flash is deprecated and not supported by modern browsers.' },
  { id: 'missing_https_redirect', label: 'Missing Https Redirect',                        severity: 'warning',  description: "The site's HTTP version does not redirect to HTTPS." },
  { id: 'lorem_ipsum',            label: 'Page Contains Lorem Ipsum Content',             severity: 'error',    description: 'Pages containing lorem ipsum placeholder text. This indicates unfinished content.' },
  { id: 'missing_favicon',        label: 'Missing Favicon',                               severity: 'warning',  description: 'The site has no favicon. Favicons appear in browser tabs and bookmarks.' },
  { id: 'canonical_to_broken',    label: 'Page contains canonical links to broken pages', severity: 'error',    description: 'Canonical tags pointing to pages that return 4XX errors.' },
  { id: 'canonical_to_redirect',  label: 'Page contains canonical links to redirects',    severity: 'warning',  description: 'Canonical tags pointing to pages that redirect. Update canonicals to point to the final URL.' },
  { id: 'deprecated_html',        label: 'Depreciated HTML Tags Used',                    severity: 'warning',  description: 'Pages using deprecated HTML tags like <font>, <center>, <marquee>. These should be replaced with CSS.' },
  { id: 'misspelled_content',     label: 'Has misspelled content',                        severity: 'passed',   description: 'No misspelling check performed (requires external API).' },
  { id: 'recursive_canonical',    label: 'Recursive Canonical Error',                     severity: 'error',    description: 'Pages where the canonical tag points back to the same page URL in a self-referencing loop with different parameters.' },
  { id: 'missing_viewport',       label: 'Missing Viewport',                              severity: 'error',    description: 'Pages without a viewport meta tag. Without this, pages display incorrectly on mobile devices.' },
  { id: 'multiple_h1',            label: 'Multiple H1 Tags',                              severity: 'warning',  description: 'Pages with more than one H1 tag. Each page should have exactly one H1.' },
  { id: 'missing_schema',         label: 'Missing Structured Data',                       severity: 'warning',  description: 'Pages without JSON-LD structured data. Structured data helps search engines understand page content.' },
  { id: 'irrelevant_description', label: 'Irrelevant Description',                        severity: 'passed',   description: 'No irrelevance check performed.' },
  { id: 'irrelevant_title',       label: 'Irrelevant Title',                              severity: 'passed',   description: 'No irrelevance check performed.' },
  { id: 'high_content_rate',      label: 'High Content Rate',                             severity: 'passed',   description: 'No pages with excessively high word count detected.' },
  { id: 'low_character_count',    label: 'Low Character Count',                           severity: 'warning',  description: 'Pages with under 200 characters of visible text. Very low content signals thin pages.' },
  { id: 'high_character_count',   label: 'High Character Count',                          severity: 'warning',  description: 'Pages with over 30,000 characters of visible text. May indicate content bloat.' },
  { id: 'http_page',              label: 'Page served over HTTP',                         severity: 'error',    description: 'Pages served over HTTP instead of HTTPS. All pages should use secure HTTPS.' },
  { id: 'low_readability',        label: 'Low Readability Rate',                          severity: 'warning',  description: 'Pages with very long average sentence length (over 30 words per sentence).' },
  { id: 'render_blocking',        label: 'Page contains render blocking resources',        severity: 'warning',  description: 'Pages with multiple script tags in the <head> that may block rendering.' },
]

function normUrl(u) {
  try {
    const parsed = new URL(u)
    parsed.hash = ''
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) parsed.pathname = parsed.pathname.slice(0, -1)
    return parsed.href
  } catch { return u }
}

async function runTests(pages, jobUrl) {
  const results = {}
  TEST_DEFS.forEach(t => { results[t.id] = { ...t, failures: 0, affectedUrls: [], details: [] } })

  const pageMap = new Map()
  pages.forEach(p => {
    pageMap.set(normUrl(p.url), p)
    if (p.originalUrl) pageMap.set(normUrl(p.originalUrl), p)
  })

  const crawledUrlSet = new Set()
  pages.forEach(p => {
    crawledUrlSet.add(normUrl(p.url))
    if (p.originalUrl) crawledUrlSet.add(normUrl(p.originalUrl))
  })

  const linksTo = new Map()
  pages.forEach(p => {
    ;(p.internalLinks || []).forEach(link => {
      const norm = normUrl(link)
      if (!linksTo.has(norm)) linksTo.set(norm, [])
      linksTo.get(norm).push(p.url)
    })
  })

  const redirectedPages = new Set()
  pages.forEach(p => {
    if (p.redirectCount > 0) redirectedPages.add(normUrl(p.originalUrl || p.url))
  })

  // 1. 4xx_errors
  pages.forEach(p => {
    if (p.statusCode >= 400 && p.statusCode < 500) {
      const linkedFrom = linksTo.get(normUrl(p.url))?.[0] || linksTo.get(normUrl(p.originalUrl))?.[0] || null
      results['4xx_errors'].details.push({ pageUrl: p.url, statusCode: p.statusCode, linkedFrom })
      results['4xx_errors'].affectedUrls.push(p.url)
      results['4xx_errors'].failures++
    }
  })

  // 2. duplicate_content
  const pageTexts = pages.map(p => ({
    url: p.url,
    wordCount: p.wordCount || 0,
    snippet: `${p.title || ''} ${(p.h1s || []).join(' ')} ${p.description || ''}`.toLowerCase().trim(),
  }))
  const dupContentPairs = new Set()
  for (let i = 0; i < pageTexts.length; i++) {
    for (let j = i + 1; j < pageTexts.length; j++) {
      const a = pageTexts[i], b = pageTexts[j]
      if (a.wordCount === 0 || b.wordCount === 0) continue
      if (a.snippet.length < 20 || b.snippet.length < 20) continue
      const diff = Math.abs(a.wordCount - b.wordCount) / Math.max(a.wordCount, b.wordCount)
      if (diff > 0.1) continue
      const aWords = new Set(a.snippet.split(/\s+/).filter(w => w.length > 3))
      const bWords = new Set(b.snippet.split(/\s+/).filter(w => w.length > 3))
      if (aWords.size === 0 || bWords.size === 0) continue
      const intersection = [...aWords].filter(w => bWords.has(w)).length
      const union = new Set([...aWords, ...bWords]).size
      if (intersection / union > 0.7) {
        const key = [a.url, b.url].sort().join('|')
        if (!dupContentPairs.has(key)) {
          dupContentPairs.add(key)
          results['duplicate_content'].details.push({ pages: [a.url, b.url], wordCountA: a.wordCount, wordCountB: b.wordCount })
          if (!results['duplicate_content'].affectedUrls.includes(a.url)) results['duplicate_content'].affectedUrls.push(a.url)
          if (!results['duplicate_content'].affectedUrls.includes(b.url)) results['duplicate_content'].affectedUrls.push(b.url)
          results['duplicate_content'].failures++
        }
      }
    }
  }

  // 3. duplicate_titles
  const titleMap = new Map()
  pages.forEach(p => {
    if (!p.title) return
    const t = p.title.trim().toLowerCase()
    if (!titleMap.has(t)) titleMap.set(t, [])
    titleMap.get(t).push(p.url)
  })
  titleMap.forEach((urls, title) => {
    if (urls.length > 1) {
      results['duplicate_titles'].details.push({ title, pages: urls })
      urls.forEach(u => { if (!results['duplicate_titles'].affectedUrls.includes(u)) results['duplicate_titles'].affectedUrls.push(u) })
      results['duplicate_titles'].failures++
    }
  })

  // 4. broken_links
  const brokenUrlSet = new Set(pages.filter(p => p.statusCode >= 400 && p.statusCode < 500).map(p => normUrl(p.url)))
  pages.forEach(p => {
    ;(p.internalLinks || []).forEach(link => {
      if (brokenUrlSet.has(normUrl(link))) {
        results['broken_links'].details.push({ linkUrl: link, foundOnPage: p.url, statusCode: 404 })
        if (!results['broken_links'].affectedUrls.includes(p.url)) results['broken_links'].affectedUrls.push(p.url)
        results['broken_links'].failures++
      }
    })
  })

  // 5. broken_resources
  const allResources = new Map()
  pages.forEach(p => {
    ;(p.resources || []).forEach(r => { if (!allResources.has(r.url)) allResources.set(r.url, { type: r.type, foundOnPage: p.url }) })
  })
  const resourceEntries = [...allResources.entries()].slice(0, MAX_RESOURCES_TO_CHECK)
  const resourceChecks = await Promise.all(
    resourceEntries.map(async ([resourceUrl, meta]) => {
      const { status } = await headRequest(resourceUrl)
      return { resourceUrl, type: meta.type, statusCode: status, foundOnPage: meta.foundOnPage }
    })
  )
  resourceChecks.forEach(r => {
    if (r.statusCode >= 400 || r.statusCode === 0) {
      results['broken_resources'].details.push(r)
      if (!results['broken_resources'].affectedUrls.includes(r.foundOnPage)) results['broken_resources'].affectedUrls.push(r.foundOnPage)
      results['broken_resources'].failures++
    }
  })

  // 6. duplicate_descriptions
  const descMap = new Map()
  pages.forEach(p => {
    if (!p.description) return
    const d = p.description.trim().toLowerCase()
    if (!descMap.has(d)) descMap.set(d, [])
    descMap.get(d).push(p.url)
  })
  descMap.forEach((urls, description) => {
    if (urls.length > 1) {
      results['duplicate_descriptions'].details.push({ description, pages: urls })
      urls.forEach(u => { if (!results['duplicate_descriptions'].affectedUrls.includes(u)) results['duplicate_descriptions'].affectedUrls.push(u) })
      results['duplicate_descriptions'].failures++
    }
  })

  // 7. not_canonical
  pages.forEach(p => {
    if (p.statusCode < 200 || p.statusCode >= 400) return
    if (!p.canonical) {
      results['not_canonical'].details.push({ pageUrl: p.url, title: p.title })
      results['not_canonical'].affectedUrls.push(p.url)
      results['not_canonical'].failures++
    }
  })

  // 8. redirect_chain
  pages.forEach(p => {
    if (p.redirectCount >= 2) {
      results['redirect_chain'].details.push({ pageUrl: p.originalUrl || p.url, redirectCount: p.redirectCount })
      results['redirect_chain'].affectedUrls.push(p.originalUrl || p.url)
      results['redirect_chain'].failures++
    }
  })

  // 9. canonical_chain
  pages.forEach(p => {
    if (!p.canonical) return
    const canonicalPage = pageMap.get(normUrl(p.canonical))
    if (canonicalPage && canonicalPage.canonical && normUrl(canonicalPage.canonical) !== normUrl(p.url)) {
      results['canonical_chain'].details.push({ pageUrl: p.url, canonical: p.canonical, canonicalCanonical: canonicalPage.canonical })
      results['canonical_chain'].affectedUrls.push(p.url)
      results['canonical_chain'].failures++
    }
  })

  // 10. meta_robots_blocking
  pages.forEach(p => {
    if (p.robots && /noindex|nofollow/i.test(p.robots)) {
      results['meta_robots_blocking'].details.push({ pageUrl: p.url, robots: p.robots })
      results['meta_robots_blocking'].affectedUrls.push(p.url)
      results['meta_robots_blocking'].failures++
    }
  })

  // 11. short_title
  pages.forEach(p => {
    if (p.title && p.title.length > 0 && p.title.length < 20) {
      results['short_title'].details.push({ pageUrl: p.url, title: p.title, length: p.title.length })
      results['short_title'].affectedUrls.push(p.url)
      results['short_title'].failures++
    }
  })

  // 12. long_title
  pages.forEach(p => {
    if (p.title && p.title.length > 60) {
      results['long_title'].details.push({ pageUrl: p.url, title: p.title, length: p.title.length })
      results['long_title'].affectedUrls.push(p.url)
      results['long_title'].failures++
    }
  })

  // 13. missing_h1
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    if (!p.h1s || p.h1s.length === 0) {
      results['missing_h1'].details.push({ pageUrl: p.url })
      results['missing_h1'].affectedUrls.push(p.url)
      results['missing_h1'].failures++
    }
  })

  // 14. missing_meta_description
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    if (!p.description || p.description.trim() === '') {
      results['missing_meta_description'].details.push({ pageUrl: p.url, title: p.title })
      results['missing_meta_description'].affectedUrls.push(p.url)
      results['missing_meta_description'].failures++
    }
  })

  // 15. redirect_links
  pages.forEach(p => {
    ;(p.internalLinks || []).forEach(link => {
      if (redirectedPages.has(normUrl(link))) {
        results['redirect_links'].details.push({ linkUrl: link, foundOnPage: p.url })
        if (!results['redirect_links'].affectedUrls.includes(p.url)) results['redirect_links'].affectedUrls.push(p.url)
        results['redirect_links'].failures++
      }
    })
  })

  // 16. missing_alt — approximated via img without alt
  pages.forEach(p => {
    const imgWithoutAlt = (p.resources || []).filter(r => r.type === 'image').length
    // We don't have per-image alt data; use resource count as proxy: if any images exist we flag it once
    if (imgWithoutAlt > 0 && p.statusCode < 400) {
      // Only flag if page has images (we can't detect missing alt without full HTML re-parse)
      // Skip — insufficient data without re-parsing HTML
    }
  })

  // 17. slow_page_load
  pages.forEach(p => {
    if (p.responseTime > 3000) {
      results['slow_page_load'].details.push({ pageUrl: p.url, responseTime: p.responseTime })
      results['slow_page_load'].affectedUrls.push(p.url)
      results['slow_page_load'].failures++
    }
  })

  // 18. encoding_not_declared
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    if (!p.charset) {
      results['encoding_not_declared'].details.push({ pageUrl: p.url })
      results['encoding_not_declared'].affectedUrls.push(p.url)
      results['encoding_not_declared'].failures++
    }
  })

  // 19. low_word_count
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    if (p.wordCount < 100 && p.wordCount > 0) {
      results['low_word_count'].details.push({ pageUrl: p.url, wordCount: p.wordCount })
      results['low_word_count'].affectedUrls.push(p.url)
      results['low_word_count'].failures++
    }
  })

  // 20. frames_used
  pages.forEach(p => {
    if (p.hasFrames) {
      results['frames_used'].details.push({ pageUrl: p.url })
      results['frames_used'].affectedUrls.push(p.url)
      results['frames_used'].failures++
    }
  })

  // 21. high_waiting_time
  pages.forEach(p => {
    if (p.responseTime > 2000) {
      results['high_waiting_time'].details.push({ pageUrl: p.url, responseTime: p.responseTime })
      results['high_waiting_time'].affectedUrls.push(p.url)
      results['high_waiting_time'].failures++
    }
  })

  // 22. http_links
  pages.forEach(p => {
    if (p.httpLinks > 0) {
      results['http_links'].details.push({ pageUrl: p.url, httpLinks: p.httpLinks })
      results['http_links'].affectedUrls.push(p.url)
      results['http_links'].failures++
    }
  })

  // 23. orphan_pages
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    const norm = normUrl(p.url)
    if (!linksTo.has(norm) || linksTo.get(norm).length === 0) {
      results['orphan_pages'].details.push({ pageUrl: p.url })
      results['orphan_pages'].affectedUrls.push(p.url)
      results['orphan_pages'].failures++
    }
  })

  // 24. duplicate_meta_tags
  pages.forEach(p => {
    const ogSet = new Set(p.ogTags || [])
    if (ogSet.size < (p.ogTags || []).length) {
      results['duplicate_meta_tags'].details.push({ pageUrl: p.url })
      results['duplicate_meta_tags'].affectedUrls.push(p.url)
      results['duplicate_meta_tags'].failures++
    }
  })

  // 25. seo_unfriendly_url
  pages.forEach(p => {
    try {
      const u = new URL(p.url)
      if (/_/.test(u.pathname) || /[A-Z]/.test(u.pathname) || u.searchParams.toString().length > 0) {
        results['seo_unfriendly_url'].details.push({ pageUrl: p.url })
        results['seo_unfriendly_url'].affectedUrls.push(p.url)
        results['seo_unfriendly_url'].failures++
      }
    } catch {}
  })

  // 26. low_content_rate
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    if (p.wordCount < 50) {
      results['low_content_rate'].details.push({ pageUrl: p.url, wordCount: p.wordCount })
      results['low_content_rate'].affectedUrls.push(p.url)
      results['low_content_rate'].failures++
    }
  })

  // 27. 5xx_errors
  pages.forEach(p => {
    if (p.statusCode >= 500) {
      results['5xx_errors'].details.push({ pageUrl: p.url, statusCode: p.statusCode })
      results['5xx_errors'].affectedUrls.push(p.url)
      results['5xx_errors'].failures++
    }
  })

  // 28. missing_title
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    if (!p.title || p.title.trim() === '') {
      results['missing_title'].details.push({ pageUrl: p.url })
      results['missing_title'].affectedUrls.push(p.url)
      results['missing_title'].failures++
    }
  })

  // 29. large_page_size
  pages.forEach(p => {
    if (p.htmlSize > 3 * 1024 * 1024) {
      results['large_page_size'].details.push({ pageUrl: p.url, htmlSize: p.htmlSize })
      results['large_page_size'].affectedUrls.push(p.url)
      results['large_page_size'].failures++
    }
  })

  // 30. too_many_links
  pages.forEach(p => {
    if (p.linkCount > 150) {
      results['too_many_links'].details.push({ pageUrl: p.url, linkCount: p.linkCount })
      results['too_many_links'].affectedUrls.push(p.url)
      results['too_many_links'].failures++
    }
  })

  // 31. doctype_missing
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    if (p.doctype === false) {
      results['doctype_missing'].details.push({ pageUrl: p.url })
      results['doctype_missing'].affectedUrls.push(p.url)
      results['doctype_missing'].failures++
    }
  })

  // 32. flash_used
  pages.forEach(p => {
    if (p.hasFlash) {
      results['flash_used'].details.push({ pageUrl: p.url })
      results['flash_used'].affectedUrls.push(p.url)
      results['flash_used'].failures++
    }
  })

  // 33. missing_https_redirect
  let httpRedirectOk = false
  try {
    const httpVersion = jobUrl.replace(/^https:\/\//i, 'http://')
    if (httpVersion !== jobUrl) {
      const { status } = await headRequest(httpVersion)
      httpRedirectOk = status >= 300 && status < 400
    } else {
      httpRedirectOk = true
    }
  } catch { httpRedirectOk = false }
  if (!httpRedirectOk) {
    results['missing_https_redirect'].details.push({ pageUrl: jobUrl })
    results['missing_https_redirect'].affectedUrls.push(jobUrl)
    results['missing_https_redirect'].failures++
  }

  // 34. lorem_ipsum
  pages.forEach(p => {
    if (p.hasLorem) {
      results['lorem_ipsum'].details.push({ pageUrl: p.url })
      results['lorem_ipsum'].affectedUrls.push(p.url)
      results['lorem_ipsum'].failures++
    }
  })

  // 35. missing_favicon
  const homepage = pages.find(p => { try { const u = new URL(p.url); return u.pathname === '/' || u.pathname === '' } catch { return false } }) || pages[0]
  if (homepage && !homepage.favicon) {
    results['missing_favicon'].details.push({ pageUrl: homepage.url })
    results['missing_favicon'].affectedUrls.push(homepage.url)
    results['missing_favicon'].failures++
  }

  // 36. canonical_to_broken
  pages.forEach(p => {
    if (!p.canonical) return
    const canonPage = pageMap.get(normUrl(p.canonical))
    if (canonPage && canonPage.statusCode >= 400) {
      results['canonical_to_broken'].details.push({ pageUrl: p.url, canonical: p.canonical })
      results['canonical_to_broken'].affectedUrls.push(p.url)
      results['canonical_to_broken'].failures++
    }
  })

  // 37. canonical_to_redirect
  pages.forEach(p => {
    if (!p.canonical) return
    const canonPage = pageMap.get(normUrl(p.canonical))
    if (canonPage && canonPage.redirectCount > 0) {
      results['canonical_to_redirect'].details.push({ pageUrl: p.url, canonical: p.canonical })
      results['canonical_to_redirect'].affectedUrls.push(p.url)
      results['canonical_to_redirect'].failures++
    }
  })

  // 38. deprecated_html
  pages.forEach(p => {
    if (p.deprecatedTags && p.deprecatedTags.length > 0) {
      results['deprecated_html'].details.push({ pageUrl: p.url, tags: p.deprecatedTags })
      results['deprecated_html'].affectedUrls.push(p.url)
      results['deprecated_html'].failures++
    }
  })

  // 40. recursive_canonical
  pages.forEach(p => {
    if (!p.canonical) return
    try {
      const pageU = new URL(p.url)
      const canonU = new URL(p.canonical, p.url)
      if (pageU.hostname === canonU.hostname && pageU.pathname === canonU.pathname && pageU.search !== canonU.search) {
        results['recursive_canonical'].details.push({ pageUrl: p.url, canonical: p.canonical })
        results['recursive_canonical'].affectedUrls.push(p.url)
        results['recursive_canonical'].failures++
      }
    } catch {}
  })

  // 41. missing_viewport
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    if (!p.viewport) {
      results['missing_viewport'].details.push({ pageUrl: p.url })
      results['missing_viewport'].affectedUrls.push(p.url)
      results['missing_viewport'].failures++
    }
  })

  // 42. multiple_h1
  pages.forEach(p => {
    if (p.h1s && p.h1s.length > 1) {
      results['multiple_h1'].details.push({ pageUrl: p.url, h1Count: p.h1s.length })
      results['multiple_h1'].affectedUrls.push(p.url)
      results['multiple_h1'].failures++
    }
  })

  // 43. missing_schema
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    if (!p.schema) {
      results['missing_schema'].details.push({ pageUrl: p.url, title: p.title })
      results['missing_schema'].affectedUrls.push(p.url)
      results['missing_schema'].failures++
    }
  })

  // 47. low_character_count
  pages.forEach(p => {
    if (p.statusCode >= 400) return
    if (p.charCount < 200 && p.charCount > 0) {
      results['low_character_count'].details.push({ pageUrl: p.url, charCount: p.charCount })
      results['low_character_count'].affectedUrls.push(p.url)
      results['low_character_count'].failures++
    }
  })

  // 48. high_character_count
  pages.forEach(p => {
    if (p.charCount > 30000) {
      results['high_character_count'].details.push({ pageUrl: p.url, charCount: p.charCount })
      results['high_character_count'].affectedUrls.push(p.url)
      results['high_character_count'].failures++
    }
  })

  // 49. http_page
  pages.forEach(p => {
    if (/^http:\/\//i.test(p.url)) {
      results['http_page'].details.push({ pageUrl: p.url })
      results['http_page'].affectedUrls.push(p.url)
      results['http_page'].failures++
    }
  })

  // 50. low_readability
  pages.forEach(p => {
    if (p.avgSentenceLen > 30) {
      results['low_readability'].details.push({ pageUrl: p.url, avgSentenceLen: p.avgSentenceLen })
      results['low_readability'].affectedUrls.push(p.url)
      results['low_readability'].failures++
    }
  })

  // 51. render_blocking
  pages.forEach(p => {
    if (p.headScripts >= 3) {
      results['render_blocking'].details.push({ pageUrl: p.url, scriptCount: p.headScripts })
      results['render_blocking'].affectedUrls.push(p.url)
      results['render_blocking'].failures++
    }
  })

  return results
}

function calcScore(testResults) {
  let criticalCount = 0, errorCount = 0, warningCount = 0
  Object.values(testResults).forEach(t => {
    if (t.severity === 'critical') criticalCount += t.failures
    else if (t.severity === 'error') errorCount += t.failures
    else if (t.severity === 'warning') warningCount += t.failures
  })
  let score = 100
  score -= Math.min(criticalCount * 15, 30)
  score -= Math.min(errorCount * 2, 40)
  score -= Math.min(warningCount * 0.15, 20)
  return Math.max(0, Math.round(score))
}

function calcScoreByDepth(pages, testResultsMap) {
  const pageIssues = new Map()
  pages.forEach(p => pageIssues.set(p.url, { errors: 0, warnings: 0 }))
  Object.values(testResultsMap).forEach(t => {
    if (t.severity === 'passed') return
    t.affectedUrls.forEach(u => {
      if (!pageIssues.has(u)) pageIssues.set(u, { errors: 0, warnings: 0 })
      if (t.severity === 'critical' || t.severity === 'error') pageIssues.get(u).errors++
      else if (t.severity === 'warning') pageIssues.get(u).warnings++
    })
  })
  const depthScores = new Map()
  pages.forEach(p => {
    const depth = p.depth ?? 1
    const issues = pageIssues.get(p.url) || { errors: 0, warnings: 0 }
    const pageScore = Math.max(0, 100 - issues.errors * 5 - issues.warnings * 1)
    if (!depthScores.has(depth)) depthScores.set(depth, [])
    depthScores.get(depth).push(pageScore)
  })
  return [...depthScores.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([depth, scores]) => ({ depth, score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
}

function buildPageResults(pages, testResultsMap) {
  const issueMap = new Map()
  pages.forEach(p => issueMap.set(p.url, 0))
  Object.values(testResultsMap).forEach(t => {
    if (t.severity === 'passed') return
    t.affectedUrls.forEach(u => { issueMap.set(u, (issueMap.get(u) || 0) + 1) })
  })
  return pages.map(p => ({ url: p.url, statusCode: p.statusCode, responseTime: p.responseTime, depth: p.depth ?? 1, issueCount: issueMap.get(p.url) || 0 }))
}

// ── Action handlers ───────────────────────────────────────────────────────────

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

async function handleCrawl(req, res) {
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }

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
      newPages.push(extractPageData(url, finalUrl, statusCode, redirectCount, responseTime, depth, html))
    } else {
      newPages.push({
        url: finalUrl, originalUrl: url, statusCode, redirectCount, responseTime, depth, htmlSize: 0,
        title: '', description: '', h1s: [], h2s: [], canonical: null, robots: null, ogTags: [],
        viewport: false, charset: false, doctype: false, favicon: false, schema: false,
        hasFrames: false, hasFlash: false, hasLorem: false, deprecatedTags: [],
        wordCount: 0, charCount: 0, httpLinks: 0, linkCount: 0, internalLinks: [], externalLinks: [],
        resources: [], avgSentenceLen: 0, headScripts: 0,
      })
    }
  }

  const { data: job, error: readErr } = await db.from('site_audit_jobs').select('crawled_pages').eq('id', jobId).single()
  if (readErr) return res.status(500).json({ error: `DB read error: ${readErr.message}` })

  const updated = [...(job.crawled_pages || []), ...newPages]
  const { error: writeErr } = await db.from('site_audit_jobs').update({ crawled_pages: updated, status: 'crawling', updated_at: new Date().toISOString() }).eq('id', jobId)
  if (writeErr) return res.status(500).json({ error: `DB write error: ${writeErr.message}` })

  return res.status(200).json({ success: true, processed: newPages.length, jobId })
}

async function handleFinalize(req, res) {
  const { jobId } = req.query
  if (!jobId) return res.status(400).json({ error: 'jobId required' })

  const db = supabase()
  const { data: job, error: readErr } = await db.from('site_audit_jobs').select('*').eq('id', jobId).single()
  if (readErr || !job) return res.status(404).json({ error: `Job not found: ${readErr?.message}` })

  const pages = job.crawled_pages || []
  if (pages.length === 0) return res.status(400).json({ error: 'No crawled pages found for this job' })

  await db.from('site_audit_jobs').update({ status: 'finalizing', updated_at: new Date().toISOString() }).eq('id', jobId)

  const testResultsMap = await runTests(pages, job.url)
  const testsArray = TEST_DEFS.map(def => testResultsMap[def.id] || { ...def, failures: 0, affectedUrls: [], details: [] })
  const overallScore = calcScore(testResultsMap)

  let criticalCount = 0, errorCount = 0, warningCount = 0, passedCount = 0, failedCount = 0
  testsArray.forEach(t => {
    if (t.failures > 0) {
      failedCount++
      if (t.severity === 'critical') criticalCount++
      else if (t.severity === 'error') errorCount++
      else if (t.severity === 'warning') warningCount++
    } else { passedCount++ }
  })

  const finalResult = {
    url: job.url,
    crawledAt: new Date().toISOString(),
    pagesAudited: pages.length,
    overallScore,
    criticalCount, errorCount, warningCount, passedCount, failedCount,
    tests: testsArray,
    scoreByDepth: calcScoreByDepth(pages, testResultsMap),
    pageResults: buildPageResults(pages, testResultsMap),
  }

  const { error: saveErr } = await db.from('site_audit_jobs').update({ result: finalResult, status: 'complete', updated_at: new Date().toISOString() }).eq('id', jobId)
  if (saveErr) return res.status(500).json({ error: `Failed to save result: ${saveErr.message}` })

  return res.status(200).json(finalResult)
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action } = req.query

  if (action === 'start')    return handleStart(req, res)
  if (action === 'status')   return handleStatus(req, res)
  if (action === 'crawl')    return handleCrawl(req, res)
  if (action === 'finalize') return handleFinalize(req, res)

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
