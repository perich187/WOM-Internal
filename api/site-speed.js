/**
 * Google PageSpeed Insights proxy
 * GET /api/site-speed?url=https://example.com&strategy=mobile|desktop
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { url, strategy = 'mobile' } = req.query
  if (!url) return res.status(400).json({ error: 'url param required' })

  const key = process.env.GOOGLE_API_KEY
  if (!key) return res.status(500).json({ error: 'GOOGLE_API_KEY not configured' })

  try {
    const endpoint =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
      `?url=${encodeURIComponent(url)}&key=${key}&strategy=${strategy}`

    const psi = await fetch(endpoint)
    const data = await psi.json()

    if (data.error) {
      return res.status(400).json({ error: data.error.message ?? 'PageSpeed error' })
    }

    const cats   = data.lighthouseResult?.categories ?? {}
    const audits = data.lighthouseResult?.audits ?? {}

    const score = key => Math.round((cats[key]?.score ?? 0) * 100)

    // Core Web Vitals
    const vital = (id) => ({
      value:       audits[id]?.displayValue ?? '—',
      numericValue: audits[id]?.numericValue ?? null,
      score:       audits[id]?.score ?? null,
    })

    const vitals = [
      { name: 'First Contentful Paint',   ...vital('first-contentful-paint') },
      { name: 'Largest Contentful Paint', ...vital('largest-contentful-paint') },
      { name: 'Total Blocking Time',      ...vital('total-blocking-time') },
      { name: 'Cumulative Layout Shift',  ...vital('cumulative-layout-shift') },
      { name: 'Speed Index',              ...vital('speed-index') },
    ]

    // Top actionable opportunities
    const opportunities = Object.values(audits)
      .filter(a => a.details?.type === 'opportunity' && a.score !== null && a.score < 0.9)
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      .slice(0, 6)
      .map(a => ({
        title:       a.title,
        description: a.description,
        savings:     a.displayValue ?? null,
        score:       a.score,
      }))

    return res.json({
      url,
      strategy,
      fetchTime: data.lighthouseResult?.fetchTime ?? null,
      scores: {
        performance:   score('performance'),
        accessibility: score('accessibility'),
        bestPractices: score('best-practices'),
        seo:           score('seo'),
      },
      vitals,
      opportunities,
    })
  } catch (err) {
    console.error('[site-speed]', err)
    return res.status(500).json({ error: err.message })
  }
}
