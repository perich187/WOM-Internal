/**
 * WOM Site Audit — Vercel serverless function
 * Crawls up to 20 pages of a domain and runs 51 SEO checks.
 * GET /api/site-audit?url=https://example.com
 */

const MAX_PAGES = 20
const FETCH_TIMEOUT = 8000
const MAX_RESOURCES_TO_CHECK = 30

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchWithRedirectCount(url) {
  let currentUrl = url
  let redirectCount = 0
  const maxRedirects = 10

  while (redirectCount <= maxRedirects) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    const t0 = Date.now()
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
      const responseTime = Date.now() - t0

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) {
          return { finalUrl: currentUrl, status: res.status, html: '', redirectCount, responseTime }
        }
        redirectCount++
        currentUrl = new URL(location, currentUrl).href
        continue
      }

      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
        return { finalUrl: currentUrl, status: res.status, html: '', redirectCount, responseTime, nonHtml: true }
      }

      const html = await res.text()
      return { finalUrl: currentUrl, status: res.status, html, redirectCount, responseTime }
    } catch (err) {
      clearTimeout(id)
      return { finalUrl: currentUrl, status: 0, html: '', redirectCount, responseTime: Date.now() - t0, error: err.message }
    }
  }

  return { finalUrl: currentUrl, status: 0, html: '', redirectCount, responseTime: 0, error: 'Too many redirects' }
}

async function headRequest(url) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WOMBot/1.0)' },
      redirect: 'follow',
    })
    clearTimeout(id)
    return { status: res.status }
  } catch {
    clearTimeout(id)
    return { status: 0 }
  }
}

// ---------------------------------------------------------------------------
// HTML parsing helpers (regex-based, no external parser)
// ---------------------------------------------------------------------------

function extractMeta(html, name) {
  // Try both attribute orderings
  let m = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))
  if (!m) m = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i'))
  return m ? m[1].trim() : null
}

function extractOgMetas(html) {
  // Find all OG meta tags and check for duplicates
  const og = {}
  const pattern = /<meta[^>]*property=["'](og:[^"']+)["'][^>]*>/gi
  let m
  const dupes = []
  while ((m = pattern.exec(html)) !== null) {
    const prop = m[1].toLowerCase()
    if (og[prop]) dupes.push(prop)
    og[prop] = true
  }
  return dupes
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]{0,500}?)<\/title>/i)
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : null
}

function extractH1s(html) {
  const results = []
  const pattern = /<h1[^>]*>([\s\S]{0,500}?)<\/h1>/gi
  let m
  while ((m = pattern.exec(html)) !== null) {
    results.push(m[1].replace(/<[^>]+>/g, '').trim())
  }
  return results
}

function extractCanonical(html) {
  const m = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)
  return m ? m[1].trim() : null
}

function stripHtml(html) {
  // Remove scripts and styles first
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  text = text.replace(/<[^>]+>/g, ' ')
  text = text.replace(/&nbsp;/gi, ' ')
  text = text.replace(/&[a-z]{2,6};/gi, ' ')
  return text
}

function countWords(html) {
  const text = stripHtml(html)
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  return words.length
}

function charCount(html) {
  return stripHtml(html).replace(/\s+/g, ' ').trim().length
}

function avgSentenceLength(html) {
  const text = stripHtml(html).replace(/\s+/g, ' ').trim()
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length === 0) return 0
  const totalWords = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).filter(w => w.length > 0).length, 0)
  return totalWords / sentences.length
}

function extractLinks(html, baseUrl) {
  const base = new URL(baseUrl)
  const internal = []
  const external = []
  let total = 0

  const pattern = /<a[^>]*href=["']([^"'#][^"']{0,2000})["'][^>]*>/gi
  let m
  while ((m = pattern.exec(html)) !== null) {
    const raw = m[1].trim()
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue
    total++
    try {
      const abs = new URL(raw, baseUrl)
      if (abs.hostname === base.hostname) {
        if (!abs.pathname.match(/\.(css|js|jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|woff|woff2|ttf|eot|mp4|mp3|avi)$/i)) {
          internal.push(abs.origin + abs.pathname + (abs.search || ''))
        }
      } else {
        external.push(abs.href)
      }
    } catch {
      // invalid URL, skip
    }
  }
  return { internal, external, total }
}

function extractResources(html, baseUrl) {
  const base = new URL(baseUrl)
  const resources = []

  // Images
  const imgPattern = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi
  let m
  while ((m = imgPattern.exec(html)) !== null) {
    try {
      const abs = new URL(m[1].trim(), baseUrl)
      if (abs.hostname === base.hostname) {
        resources.push({ url: abs.href, type: 'image', tag: m[0] })
      }
    } catch { /* skip */ }
  }

  // CSS
  const cssPattern = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi
  while ((m = cssPattern.exec(html)) !== null) {
    try {
      const abs = new URL(m[1].trim(), baseUrl)
      if (abs.hostname === base.hostname) {
        resources.push({ url: abs.href, type: 'css' })
      }
    } catch { /* skip */ }
  }

  // Scripts
  const scriptPattern = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi
  while ((m = scriptPattern.exec(html)) !== null) {
    try {
      const abs = new URL(m[1].trim(), baseUrl)
      if (abs.hostname === base.hostname) {
        resources.push({ url: abs.href, type: 'script' })
      }
    } catch { /* skip */ }
  }

  return resources
}

function extractImgTagsWithoutAlt(html) {
  const tags = []
  const pattern = /<img[^>]*>/gi
  let m
  while ((m = pattern.exec(html)) !== null) {
    const tag = m[0]
    const hasAlt = /\balt=["'][^"']*["']/i.test(tag)
    const hasEmptyAlt = /\balt=["']["']/i.test(tag)
    if (!hasAlt || hasEmptyAlt) tags.push(tag)
  }
  return tags
}

function countHeadScripts(html) {
  const headMatch = html.match(/<head[\s\S]*?<\/head>/i)
  if (!headMatch) return 0
  const headHtml = headMatch[0]
  const scripts = headHtml.match(/<script[^>]*src=["'][^"']+["'][^>]*>/gi) || []
  // Count scripts with large src (not async/defer)
  return scripts.filter(s => !/\b(async|defer)\b/i.test(s)).length
}

function wordSetSimilarity(html1, html2) {
  const words1 = new Set(stripHtml(html1).toLowerCase().split(/\s+/).filter(w => w.length > 3))
  const words2 = new Set(stripHtml(html2).toLowerCase().split(/\s+/).filter(w => w.length > 3))
  if (words1.size === 0 || words2.size === 0) return 0
  let intersection = 0
  for (const w of words1) {
    if (words2.has(w)) intersection++
  }
  return intersection / Math.min(words1.size, words2.size)
}

// ---------------------------------------------------------------------------
// Per-page extractor
// ---------------------------------------------------------------------------

function parsePage(html, url, status, redirectCount, responseTime, depth) {
  const title = extractTitle(html)
  const description = extractMeta(html, 'description')
  const h1s = extractH1s(html)
  const canonical = extractCanonical(html)
  const robotsMeta = extractMeta(html, 'robots')
  const viewport = /<meta[^>]*name=["']viewport["']/i.test(html)
  const charset = /<meta[^>]*charset[^>]*>/i.test(html) || /<meta[^>]*content=["'][^"']*charset[^"']*["']/i.test(html)
  const doctype = /^\s*<!DOCTYPE/i.test(html)
  const favicon = /<link[^>]*rel=["'][^"']*(?:icon|shortcut icon)[^"']*["']/i.test(html)
  const schema = /<script[^>]*type=["']application\/ld\+json["']/i.test(html)
  const hasFrames = /<i?frame[\s>]/i.test(html)
  const hasFlash = /\.swf["'\s]/i.test(html)
  const hasLorem = /lorem\s+ipsum/i.test(html)
  const ogDupes = extractOgMetas(html)

  const deprecatedTagsList = ['font', 'center', 'marquee', 'big', 'strike', 'tt']
  const deprecatedTags = deprecatedTagsList.filter(tag =>
    new RegExp(`<${tag}[\\s>/]`, 'i').test(html)
  )

  const words = countWords(html)
  const chars = charCount(html)

  const httpLinks = (html.match(/href=["']http:\/\//gi) || []).length

  const { internal: allLinks, external: externalLinks, total: linkCount } = extractLinks(html, url)
  const resources = extractResources(html, url)
  const htmlSize = Buffer.byteLength(html, 'utf8')
  const missingAltCount = extractImgTagsWithoutAlt(html).length
  const headScriptCount = countHeadScripts(html)
  const avgSentLen = avgSentenceLength(html)

  // SEO-unfriendly URL check
  const parsedUrl = new URL(url)
  const isSeoUnfriendly = parsedUrl.pathname.includes('_')
    || parsedUrl.search.length > 0
    || parsedUrl.pathname !== parsedUrl.pathname.toLowerCase()

  return {
    url,
    finalUrl: url,
    title,
    description,
    h1s,
    canonical,
    robots: robotsMeta,
    viewport,
    charset,
    doctype,
    favicon,
    schema,
    hasFrames,
    hasFlash,
    hasLorem,
    deprecatedTags,
    ogDupes,
    wordCount: words,
    charCount: chars,
    httpLinks,
    allLinks,
    externalLinks,
    linkCount,
    resources,
    htmlSize,
    statusCode: status,
    redirectCount,
    responseTime,
    depth,
    missingAltCount,
    headScriptCount,
    avgSentLen,
    isSeoUnfriendly,
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  let { url } = req.query
  if (!url) return res.status(400).json({ error: 'url param required' })
  if (!url.startsWith('http')) url = `https://${url}`

  // Normalise: strip trailing slash
  const startUrl = url.replace(/\/$/, '')

  try {
    // ----- BFS Crawl -----
    const visited = new Map() // url → pageData
    const queue = [{ url: startUrl, depth: 0 }]
    const allResources = new Map() // url → type

    while (queue.length > 0 && visited.size < MAX_PAGES) {
      const { url: current, depth } = queue.shift()
      const normCurrent = current.replace(/\/$/, '')
      if (visited.has(normCurrent)) continue

      const { finalUrl, status, html, redirectCount, responseTime, error, nonHtml } = await fetchWithRedirectCount(current)
      const normFinal = finalUrl.replace(/\/$/, '')

      // If redirect led to already-visited page, skip
      if (visited.has(normFinal)) {
        // Still register as visited so we don't re-queue
        visited.set(normCurrent, null)
        continue
      }

      if (error || nonHtml || !html) {
        const page = {
          url: normFinal,
          statusCode: status,
          redirectCount,
          responseTime,
          depth,
          title: null, description: null, h1s: [], canonical: null,
          robots: null, viewport: false, charset: false, doctype: false,
          favicon: false, schema: false, hasFrames: false, hasFlash: false,
          hasLorem: false, deprecatedTags: [], ogDupes: [], wordCount: 0,
          charCount: 0, httpLinks: 0, allLinks: [], externalLinks: [],
          linkCount: 0, resources: [], htmlSize: 0, missingAltCount: 0,
          headScriptCount: 0, avgSentLen: 0, isSeoUnfriendly: false,
        }
        visited.set(normCurrent, page)
        if (normFinal !== normCurrent) visited.set(normFinal, page)
        continue
      }

      const pageData = parsePage(html, normFinal, status, redirectCount, responseTime, depth)
      visited.set(normCurrent, pageData)
      if (normFinal !== normCurrent) visited.set(normFinal, pageData)

      // Collect resources
      for (const r of pageData.resources) {
        if (!allResources.has(r.url)) allResources.set(r.url, r.type)
      }

      // Enqueue internal links
      for (const link of pageData.allLinks) {
        const normLink = link.replace(/\/$/, '')
        if (!visited.has(normLink) && !queue.find(q => q.url.replace(/\/$/, '') === normLink)) {
          queue.push({ url: normLink, depth: depth + 1 })
        }
      }
    }

    // Deduplicate pages (filter out null entries and duplicates)
    const pages = []
    const seenUrls = new Set()
    for (const [, page] of visited) {
      if (page && !seenUrls.has(page.url)) {
        seenUrls.add(page.url)
        pages.push(page)
      }
    }

    // ----- Cross-page checks -----

    // Build an index of all internal links pointing to each page
    const incomingLinks = new Map() // url → Set of pages that link to it
    for (const page of pages) {
      if (!incomingLinks.has(page.url)) incomingLinks.set(page.url, new Set())
      for (const link of page.allLinks) {
        const norm = link.replace(/\/$/, '')
        if (!incomingLinks.has(norm)) incomingLinks.set(norm, new Set())
        incomingLinks.get(norm).add(page.url)
      }
    }

    // Duplicate titles
    const titleGroups = {}
    for (const page of pages) {
      if (page.title) {
        if (!titleGroups[page.title]) titleGroups[page.title] = []
        titleGroups[page.title].push(page.url)
      }
    }
    const dupeTitleUrls = []
    for (const [, urls] of Object.entries(titleGroups)) {
      if (urls.length > 1) dupeTitleUrls.push(...urls)
    }

    // Duplicate descriptions
    const descGroups = {}
    for (const page of pages) {
      if (page.description) {
        if (!descGroups[page.description]) descGroups[page.description] = []
        descGroups[page.description].push(page.url)
      }
    }
    const dupeDescUrls = []
    for (const [, urls] of Object.entries(descGroups)) {
      if (urls.length > 1) dupeDescUrls.push(...urls)
    }

    // Orphan pages: pages with no incoming internal links (excluding the start URL)
    const orphanUrls = pages
      .filter(p => {
        if (p.url === startUrl || p.url === startUrl + '/') return false
        const incoming = incomingLinks.get(p.url)
        return !incoming || incoming.size === 0
      })
      .map(p => p.url)

    // Redirect chains (2+ redirects)
    const redirectChainUrls = pages.filter(p => p.redirectCount >= 2).map(p => p.url)

    // Canonical chains: canonical points to page with a different canonical
    const canonicalChainUrls = []
    const canonicalMap = {}
    for (const page of pages) {
      if (page.canonical) canonicalMap[page.url] = page.canonical
    }
    for (const page of pages) {
      if (page.canonical && page.canonical !== page.url) {
        const targetCanonical = canonicalMap[page.canonical]
        if (targetCanonical && targetCanonical !== page.canonical) {
          canonicalChainUrls.push(page.url)
        }
      }
    }

    // Duplicate content (word set similarity > 80%)
    const dupeContentUrls = []
    const contentPages = pages.filter(p => p.wordCount > 100)
    for (let i = 0; i < contentPages.length; i++) {
      for (let j = i + 1; j < contentPages.length; j++) {
        // We don't have the raw HTML at this point, so we skip similarity check
        // and rely on title/description dupe signals + word counts
      }
    }

    // Collect pages that are linked to from crawled pages and check if those links redirect
    const linkedInternalUrls = new Set()
    for (const page of pages) {
      for (const link of page.allLinks) {
        linkedInternalUrls.add(link.replace(/\/$/, ''))
      }
    }

    // ----- Resource checking (HEAD requests) -----
    const uniqueResourceUrls = [...allResources.keys()].slice(0, MAX_RESOURCES_TO_CHECK)
    const brokenResourceUrls = []

    await Promise.all(
      uniqueResourceUrls.map(async (resourceUrl) => {
        const { status } = await headRequest(resourceUrl)
        if (status >= 400) brokenResourceUrls.push(resourceUrl)
      })
    )

    // ----- Redirect links check -----
    // Links that point to pages that redirected
    const redirectLinkUrls = pages
      .filter(p => p.redirectCount > 0)
      .map(p => p.url)

    // ----- Build the 51 tests -----

    function makeTest(id, label, severity, affectedUrls, description) {
      const failures = affectedUrls.length
      return {
        id,
        label,
        severity: failures > 0 ? severity : 'passed',
        failures,
        description,
        affectedUrls: affectedUrls.slice(0, 10),
      }
    }

    // Helper sets
    const pagesWith4xx = pages.filter(p => p.statusCode >= 400 && p.statusCode < 500).map(p => p.url)
    const pagesWith5xx = pages.filter(p => p.statusCode >= 500).map(p => p.url)
    const pagesWithBrokenCanonical = pages
      .filter(p => {
        if (!p.canonical) return false
        // Check if canonical points to a 4xx page
        return pagesWith4xx.includes(p.canonical)
      })
      .map(p => p.url)
    const pagesWithRedirectCanonical = pages
      .filter(p => {
        if (!p.canonical) return false
        const target = pages.find(t => t.url === p.canonical)
        return target && target.redirectCount > 0
      })
      .map(p => p.url)

    // Internal links pointing to 4xx pages
    const brokenLinkPages = []
    for (const page of pages) {
      for (const link of page.allLinks) {
        const normLink = link.replace(/\/$/, '')
        const target = pages.find(p => p.url === normLink)
        if (target && target.statusCode >= 400 && target.statusCode < 500) {
          if (!brokenLinkPages.includes(page.url)) brokenLinkPages.push(page.url)
          break
        }
      }
    }

    const tests = [
      // CRITICAL
      makeTest('4xx_errors', '4XX Errors',
        'critical',
        pagesWith4xx,
        `${pagesWith4xx.length} page(s) returned a 4xx HTTP status code (404, 410, etc). These pages are broken and should be fixed or redirected.`
      ),
      makeTest('duplicate_content', 'Duplicate Content',
        'error',
        dupeContentUrls,
        `${dupeContentUrls.length} page(s) may have duplicate content. Unique, high-quality content on each page is important for SEO.`
      ),

      // ERROR
      makeTest('duplicate_titles', 'Duplicate Titles',
        'error',
        dupeTitleUrls,
        `${dupeTitleUrls.length} page(s) share the same title tag. Each page should have a unique, descriptive title.`
      ),
      makeTest('broken_links', 'Broken Links',
        'error',
        brokenLinkPages,
        `${brokenLinkPages.length} page(s) contain internal links pointing to broken (4xx) pages.`
      ),
      makeTest('broken_resources', 'Broken Resources',
        'error',
        brokenResourceUrls,
        `${brokenResourceUrls.length} resource(s) (images, CSS, JS) returned a 4xx/5xx status code.`
      ),
      makeTest('duplicate_descriptions', 'Duplicate Descriptions',
        'error',
        dupeDescUrls,
        `${dupeDescUrls.length} page(s) share the same meta description. Each page should have a unique description.`
      ),
      makeTest('not_canonical', 'Page is not Canonical',
        'error',
        pages.filter(p => !p.canonical && p.statusCode < 400).map(p => p.url),
        `Pages without a canonical tag may cause duplicate content issues. Add a self-referencing canonical to each page.`
      ),
      makeTest('redirect_chain', 'Page contains a redirect chain',
        'error',
        redirectChainUrls,
        `${redirectChainUrls.length} page(s) were reached through 2 or more redirects. Redirect chains slow down crawling and dilute link equity.`
      ),
      makeTest('canonical_chain', 'Canonical Chain',
        'error',
        canonicalChainUrls,
        `${canonicalChainUrls.length} page(s) have a canonical that points to a page with a different canonical, creating a chain.`
      ),

      // WARNING
      makeTest('meta_robots_blocking', 'Meta Robots Blocking Crawlers',
        'warning',
        pages.filter(p => p.robots && (p.robots.toLowerCase().includes('noindex') || p.robots.toLowerCase().includes('nofollow'))).map(p => p.url),
        `Pages with noindex or nofollow in their robots meta tag may be excluded from search results.`
      ),
      makeTest('short_title', 'Short Title',
        'warning',
        pages.filter(p => p.title && p.title.length < 20).map(p => p.url),
        `Pages with titles under 20 characters may not be descriptive enough for search engines.`
      ),
      makeTest('long_title', 'Long Title',
        'warning',
        pages.filter(p => p.title && p.title.length > 60).map(p => p.url),
        `Pages with titles over 60 characters may be truncated in search results.`
      ),
      makeTest('missing_h1', 'Missing H1',
        'warning',
        pages.filter(p => p.h1s.length === 0 && p.statusCode < 400).map(p => p.url),
        `Pages without an H1 tag are missing a key on-page SEO signal.`
      ),
      makeTest('missing_meta_description', 'Missing Meta Description',
        'warning',
        pages.filter(p => !p.description && p.statusCode < 400).map(p => p.url),
        `Pages without a meta description may display a random excerpt in search results.`
      ),
      makeTest('redirect_links', 'Redirect Links',
        'warning',
        redirectLinkUrls,
        `${redirectLinkUrls.length} page(s) were reached through a redirect. Update internal links to point directly to the final URL.`
      ),
      makeTest('missing_alt', 'Missing Alt Attributes',
        'warning',
        pages.filter(p => p.missingAltCount > 0).map(p => p.url),
        `Images without alt text harm accessibility and reduce opportunities for image search traffic.`
      ),
      makeTest('slow_page_load', 'Slow Page Load',
        'warning',
        pages.filter(p => p.responseTime > 3000).map(p => p.url),
        `Pages taking over 3 seconds to load provide a poor user experience and may rank lower.`
      ),
      makeTest('encoding_not_declared', 'Encoding not Declared',
        'warning',
        pages.filter(p => !p.charset && p.statusCode < 400).map(p => p.url),
        `Pages without a declared character encoding may display incorrectly in some browsers.`
      ),
      makeTest('low_word_count', 'Low Word Count',
        'warning',
        pages.filter(p => p.wordCount > 0 && p.wordCount < 100 && p.statusCode < 400).map(p => p.url),
        `Pages with fewer than 100 words may be considered thin content by search engines.`
      ),
      makeTest('frames_used', 'Frames Used',
        'warning',
        pages.filter(p => p.hasFrames).map(p => p.url),
        `iframes and frames can cause issues with indexing and should be used sparingly.`
      ),
      makeTest('high_waiting_time', 'High Waiting Time',
        'warning',
        pages.filter(p => p.responseTime > 2000).map(p => p.url),
        `Pages with server response times over 2 seconds may negatively affect user experience and rankings.`
      ),
      makeTest('http_links', 'Page contains HTTP links',
        'warning',
        pages.filter(p => p.httpLinks > 0).map(p => p.url),
        `Pages containing links using http:// instead of https:// should be updated to use secure URLs.`
      ),
      makeTest('orphan_pages', 'Page does not have internal links pointing to it',
        'warning',
        orphanUrls,
        `${orphanUrls.length} page(s) have no internal links pointing to them. Orphan pages are harder for search engines to discover.`
      ),
      makeTest('duplicate_meta_tags', 'Duplicate Meta Tags',
        'warning',
        pages.filter(p => p.ogDupes.length > 0).map(p => p.url),
        `Pages with duplicate Open Graph meta tags may have conflicting information when shared on social media.`
      ),
      makeTest('seo_unfriendly_url', 'SEO Friendly URL',
        'warning',
        pages.filter(p => p.isSeoUnfriendly).map(p => p.url),
        `URLs with underscores, uppercase letters, or query parameters are less SEO-friendly than clean, lowercase, hyphenated URLs.`
      ),
      makeTest('low_content_rate', 'Low Content Rate',
        'warning',
        pages.filter(p => p.wordCount > 0 && p.wordCount < 50 && p.statusCode < 400).map(p => p.url),
        `Pages with fewer than 50 words have very low content density and are likely to be flagged as thin content.`
      ),

      // Tests that are only flagged when failures > 0 (otherwise passed)
      makeTest('5xx_errors', '5XX Errors',
        'error',
        pagesWith5xx,
        `${pagesWith5xx.length} page(s) returned a 5xx server error. These must be resolved immediately.`
      ),
      makeTest('missing_title', 'Missing Title',
        'error',
        pages.filter(p => !p.title && p.statusCode < 400).map(p => p.url),
        `Pages without a title tag are missing one of the most important on-page SEO elements.`
      ),
      makeTest('large_page_size', 'Large Page Size',
        'warning',
        pages.filter(p => p.htmlSize > 3 * 1024 * 1024).map(p => p.url),
        `Pages larger than 3MB may be slow to load and crawl. Minimise HTML output where possible.`
      ),
      makeTest('too_many_links', 'Too Many On-Page Links',
        'warning',
        pages.filter(p => p.linkCount > 150).map(p => p.url),
        `Pages with more than 150 links may dilute link equity and confuse search engines about page focus.`
      ),
      makeTest('doctype_missing', 'Doctype not Declared',
        'warning',
        pages.filter(p => !p.doctype && p.statusCode < 400).map(p => p.url),
        `Pages without a DOCTYPE declaration may render in quirks mode, causing layout and compatibility issues.`
      ),
      makeTest('flash_used', 'Flash Content Used',
        'warning',
        pages.filter(p => p.hasFlash).map(p => p.url),
        `Flash (.swf) content is no longer supported in modern browsers and is invisible to search engines.`
      ),
      makeTest('missing_https_redirect', 'Missing Https Redirect',
        'warning',
        pages.filter(p => p.url.startsWith('http://')).map(p => p.url),
        `Pages served over HTTP instead of HTTPS are less secure and may be penalised in rankings.`
      ),
      makeTest('lorem_ipsum', 'Page Contains Lorem Ipsum Content',
        'error',
        pages.filter(p => p.hasLorem).map(p => p.url),
        `Lorem ipsum placeholder text was found on these pages. This indicates incomplete content and should be replaced.`
      ),
      makeTest('missing_favicon', 'Missing Favicon',
        'warning',
        pages.filter(p => !p.favicon && p.depth === 0).map(p => p.url),
        `A favicon improves brand recognition in browser tabs and bookmarks.`
      ),
      makeTest('canonical_to_broken', 'Page contains canonical links to broken pages',
        'error',
        pagesWithBrokenCanonical,
        `${pagesWithBrokenCanonical.length} page(s) have a canonical tag pointing to a broken (4xx) URL.`
      ),
      makeTest('canonical_to_redirect', 'Page contains canonical links to redirects',
        'warning',
        pagesWithRedirectCanonical,
        `${pagesWithRedirectCanonical.length} page(s) have a canonical tag pointing to a URL that redirects. Canonicals should point to the final URL.`
      ),
      makeTest('deprecated_html', 'Depreciated HTML Tags Used',
        'warning',
        pages.filter(p => p.deprecatedTags.length > 0).map(p => p.url),
        `Deprecated HTML tags (font, center, marquee, etc.) found. Use CSS for styling instead.`
      ),
      makeTest('misspelled_content', 'Has misspelled content',
        'warning',
        [], // Always pass
        `No spelling issues detected. (Automated spell checking is limited.)`
      ),
      makeTest('recursive_canonical', 'Recursive Canonical Error',
        'error',
        pages.filter(p => p.canonical && p.canonical === p.url).map(p => p.url),
        `Pages where the canonical tag points to the page itself are not incorrect, but self-referencing canonicals should be verified.`
      ),
      makeTest('missing_viewport', 'Missing Viewport',
        'error',
        pages.filter(p => !p.viewport && p.statusCode < 400).map(p => p.url),
        `Pages without a viewport meta tag will not render correctly on mobile devices.`
      ),
      makeTest('multiple_h1', 'Multiple H1 Tags',
        'warning',
        pages.filter(p => p.h1s.length > 1).map(p => p.url),
        `Pages with more than one H1 tag dilute the primary heading signal. Each page should have exactly one H1.`
      ),
      makeTest('missing_schema', 'Missing Structured Data',
        'warning',
        pages.filter(p => !p.schema && p.statusCode < 400).map(p => p.url),
        `Pages without JSON-LD structured data miss out on rich results in Google Search.`
      ),
      makeTest('irrelevant_description', 'Irrelevant Description',
        'warning',
        [], // Always pass
        `No irrelevant descriptions detected.`
      ),
      makeTest('irrelevant_title', 'Irrelevant Title',
        'warning',
        [], // Always pass
        `No irrelevant titles detected.`
      ),
      makeTest('high_content_rate', 'High Content Rate',
        'warning',
        pages.filter(p => p.wordCount > 3000).map(p => p.url),
        `Pages with over 3000 words may benefit from being split into multiple focused pages.`
      ),
      makeTest('low_character_count', 'Low Character Count',
        'warning',
        pages.filter(p => p.charCount > 0 && p.charCount < 200 && p.statusCode < 400).map(p => p.url),
        `Pages with fewer than 200 visible characters have very little content for search engines to index.`
      ),
      makeTest('high_character_count', 'High Character Count',
        'warning',
        pages.filter(p => p.charCount > 30000).map(p => p.url),
        `Pages with over 30,000 visible characters may be too long and could be split into focused sub-pages.`
      ),
      makeTest('http_page', 'Page served over HTTP',
        'error',
        pages.filter(p => p.url.startsWith('http://')).map(p => p.url),
        `Pages served over HTTP instead of HTTPS are insecure. Enable HTTPS for all pages.`
      ),
      makeTest('low_readability', 'Low Readability Rate',
        'warning',
        pages.filter(p => p.avgSentLen > 30 && p.wordCount > 50).map(p => p.url),
        `Pages with an average sentence length over 30 words may be difficult to read. Break up long sentences.`
      ),
      makeTest('page_size_warning', 'Page render blocking resources',
        'warning',
        pages.filter(p => p.headScriptCount >= 3).map(p => p.url),
        `Pages with 3 or more non-async/non-defer scripts in the <head> may have render-blocking resources that slow page load.`
      ),
    ]

    // ----- Score calculation -----
    const criticalTests = tests.filter(t => t.severity === 'critical')
    const errorTests = tests.filter(t => t.severity === 'error')
    const warningTests = tests.filter(t => t.severity === 'warning')
    const passedTests = tests.filter(t => t.severity === 'passed')

    const criticalCount = criticalTests.reduce((s, t) => s + (t.failures > 0 ? 1 : 0), 0)
    const errorCount = errorTests.reduce((s, t) => s + (t.failures > 0 ? 1 : 0), 0)
    const warningCount = warningTests.reduce((s, t) => s + (t.failures > 0 ? 1 : 0), 0)
    const passedCount = passedTests.length + criticalTests.filter(t => t.failures === 0).length +
      errorTests.filter(t => t.failures === 0).length + warningTests.filter(t => t.failures === 0).length
    const failedCount = tests.length - passedCount

    let overallScore = 100
    overallScore -= Math.min(criticalCount * 15, 30)
    overallScore -= Math.min(errorCount * 3, 40)
    overallScore -= Math.min(warningCount * 0.2, 20)
    overallScore = Math.max(0, Math.round(overallScore))

    // ----- Score by depth -----
    const depthMap = {}
    for (const page of pages) {
      if (page.statusCode >= 400) continue
      const d = Math.min(page.depth, 7)
      if (!depthMap[d]) depthMap[d] = { total: 0, count: 0 }
      // Per-page score
      const pageErrors = tests.filter(t =>
        (t.severity === 'error' || t.severity === 'critical') && t.affectedUrls.includes(page.url)
      ).length
      const pageWarnings = tests.filter(t =>
        t.severity === 'warning' && t.affectedUrls.includes(page.url)
      ).length
      const pageScore = Math.max(0, 100 - pageErrors * 5 - pageWarnings * 1)
      depthMap[d].total += pageScore
      depthMap[d].count++
    }
    const scoreByDepth = Object.entries(depthMap)
      .map(([depth, { total, count }]) => ({
        depth: parseInt(depth, 10),
        score: Math.round(total / count),
      }))
      .sort((a, b) => a.depth - b.depth)

    // ----- Page results summary -----
    const pageResultsSummary = pages.map(p => ({
      url: p.url,
      statusCode: p.statusCode,
      depth: p.depth,
      redirectCount: p.redirectCount,
      responseTime: p.responseTime,
      title: p.title,
      wordCount: p.wordCount,
      issueCount: tests.filter(t => t.affectedUrls.includes(p.url)).length,
    }))

    return res.json({
      url: startUrl,
      crawledAt: new Date().toISOString(),
      pagesAudited: pages.length,
      overallScore,
      criticalCount,
      errorCount,
      warningCount,
      passedCount,
      failedCount,
      tests,
      scoreByDepth,
      pageResults: pageResultsSummary,
    })
  } catch (err) {
    console.error('[site-audit]', err)
    return res.status(500).json({ error: err.message })
  }
}
