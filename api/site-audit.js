/**
 * Custom site audit — crawls a domain's homepage + up to 20 internal pages
 * and checks for common SEO issues.
 * GET /api/site-audit?url=https://example.com
 */

const MAX_PAGES   = 20
const FETCH_TIMEOUT = 8000

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WOMBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    const html = await res.text()
    return { html, status: res.status, ok: res.ok }
  } finally {
    clearTimeout(id)
  }
}

function extractLinks(html, baseUrl) {
  const base = new URL(baseUrl)
  const links = new Set()
  const pattern = /href=["'](.*?)["']/gi
  let m
  while ((m = pattern.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], baseUrl)
      if (abs.hostname === base.hostname && abs.pathname !== base.pathname) {
        // Only HTML pages (no assets, anchors, query strings with common params)
        if (!abs.pathname.match(/\.(css|js|jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|woff|ttf)$/i)) {
          links.add(abs.origin + abs.pathname)
        }
      }
    } catch (_) { /* invalid URL */ }
  }
  return [...links]
}

function auditPage(html, url) {
  const issues = []

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null
  if (!title) {
    issues.push({ severity: 'error', category: 'Title Tag', message: `Missing title tag`, url })
  } else if (title.length > 60) {
    issues.push({ severity: 'warning', category: 'Title Tag', message: `Title too long (${title.length} chars): "${title.slice(0, 50)}…"`, url })
  } else if (title.length < 10) {
    issues.push({ severity: 'warning', category: 'Title Tag', message: `Title too short (${title.length} chars): "${title}"`, url })
  }

  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
    ?? html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i)
  const desc = descMatch ? descMatch[1].trim() : null
  if (!desc) {
    issues.push({ severity: 'error', category: 'Meta Description', message: `Missing meta description`, url })
  } else if (desc.length > 160) {
    issues.push({ severity: 'warning', category: 'Meta Description', message: `Description too long (${desc.length} chars)`, url })
  }

  // H1
  const h1Matches = html.match(/<h1[^>]*>/gi) ?? []
  if (h1Matches.length === 0) {
    issues.push({ severity: 'error', category: 'H1 Tag', message: `No H1 tag found`, url })
  } else if (h1Matches.length > 1) {
    issues.push({ severity: 'warning', category: 'H1 Tag', message: `Multiple H1 tags (${h1Matches.length}) — use only one`, url })
  }

  // Images without alt
  const imgTags = html.match(/<img[^>]*>/gi) ?? []
  const missingAlt = imgTags.filter(t => !t.match(/alt=["'][^"']*["']/i) || t.match(/alt=["']["']/i))
  if (missingAlt.length > 0) {
    issues.push({ severity: 'warning', category: 'Image Alt Text', message: `${missingAlt.length} image(s) missing alt text`, url })
  }

  // Viewport meta (mobile friendliness)
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html)
  if (!hasViewport) {
    issues.push({ severity: 'error', category: 'Mobile Friendliness', message: `Missing viewport meta tag`, url })
  }

  // Canonical
  const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html)
  if (!hasCanonical) {
    issues.push({ severity: 'warning', category: 'Canonical Tag', message: `No canonical tag found`, url })
  }

  // Structured data
  const hasSchema = /<script[^>]*type=["']application\/ld\+json["']/i.test(html)
  if (!hasSchema) {
    issues.push({ severity: 'warning', category: 'Structured Data', message: `No JSON-LD structured data found`, url })
  }

  // Robots meta
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([\s\S]*?)["']/i)
  if (robotsMatch) {
    const robots = robotsMatch[1].toLowerCase()
    if (robots.includes('noindex')) {
      issues.push({ severity: 'error', category: 'Robots Meta', message: `Page has noindex — won't appear in Google`, url })
    }
  }

  return issues
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  let { url } = req.query
  if (!url) return res.status(400).json({ error: 'url param required' })
  if (!url.startsWith('http')) url = `https://${url}`

  try {
    const visited  = new Set()
    const queue    = [url]
    const allIssues = []
    const pageResults = []
    let brokenLinks  = 0

    while (queue.length > 0 && visited.size < MAX_PAGES) {
      const current = queue.shift()
      if (visited.has(current)) continue
      visited.add(current)

      let result
      try {
        result = await fetchWithTimeout(current)
      } catch (err) {
        brokenLinks++
        pageResults.push({ url: current, status: 'error', issues: 0 })
        continue
      }

      if (!result.ok) {
        if (result.status >= 400) brokenLinks++
        pageResults.push({ url: current, status: result.status, issues: 0 })
        continue
      }

      const pageIssues = auditPage(result.html, current)
      allIssues.push(...pageIssues)
      pageResults.push({ url: current, status: result.status, issues: pageIssues.length })

      // Discover more internal links (only from homepage to keep it fast)
      if (visited.size === 1) {
        const links = extractLinks(result.html, current)
        for (const l of links) {
          if (!visited.has(l)) queue.push(l)
        }
      }
    }

    // Aggregate by category + severity
    const byCategory = {}
    for (const issue of allIssues) {
      const key = issue.category
      if (!byCategory[key]) byCategory[key] = { category: key, errors: 0, warnings: 0, examples: [] }
      if (issue.severity === 'error')   byCategory[key].errors++
      if (issue.severity === 'warning') byCategory[key].warnings++
      if (byCategory[key].examples.length < 3) byCategory[key].examples.push(issue.url)
    }

    if (brokenLinks > 0) {
      byCategory['Broken Links'] = {
        category: 'Broken Links',
        errors: brokenLinks,
        warnings: 0,
        examples: [],
      }
    }

    const summary = Object.values(byCategory)
    const totalErrors   = summary.reduce((s, c) => s + c.errors, 0)
    const totalWarnings = summary.reduce((s, c) => s + c.warnings, 0)
    const healthScore   = Math.max(0, 100 - (totalErrors * 8) - (totalWarnings * 3))

    return res.json({
      url,
      pagesAudited: visited.size,
      healthScore,
      totalErrors,
      totalWarnings,
      summary,
      pageResults: pageResults.slice(0, 30),
    })
  } catch (err) {
    console.error('[site-audit]', err)
    return res.status(500).json({ error: err.message })
  }
}
