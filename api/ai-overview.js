/**
 * AI SEO Overview — fetches a URL's HTML then asks Claude to analyse it
 * GET /api/ai-overview?url=https://example.com
 */
import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'url param required' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  // 1. Fetch page HTML (server-side to avoid CORS)
  let html = ''
  let fetchError = null
  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WOMBot/1.0; +https://wom-internal.vercel.app)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    })
    html = await pageRes.text()
    // Trim to ~12k chars to stay within token limits
    html = html.slice(0, 12000)
  } catch (err) {
    fetchError = err.message
  }

  // 2. Extract readable page info even if full fetch failed
  const titleMatch  = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const descMatch   = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
    ?? html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i)
  const h1Match     = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const canonMatch  = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([\s\S]*?)["']/i)
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([\s\S]*?)["']/i)

  const pageInfo = {
    title:     titleMatch  ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null,
    metaDesc:  descMatch   ? descMatch[1].trim() : null,
    h1:        h1Match     ? h1Match[1].replace(/<[^>]+>/g, '').trim() : null,
    canonical: canonMatch  ? canonMatch[1].trim() : null,
    robots:    robotsMatch ? robotsMatch[1].trim() : null,
    fetchError,
  }

  // 3. Call Claude
  try {
    const client = new Anthropic({ apiKey })

    const prompt = fetchError
      ? `I could not fetch the page at ${url} (${fetchError}). Based on the URL alone, provide general SEO recommendations.`
      : `Analyse the following webpage for SEO and return a JSON array (no markdown, just the raw JSON array). Each item must have exactly: {"category": string, "status": "good"|"warning"|"error", "message": string}.

Cover these areas (use the extracted data where possible):
1. Title Tag — value: "${pageInfo.title ?? 'not found'}"
2. Meta Description — value: "${pageInfo.metaDesc ?? 'not found'}"
3. H1 Tag — value: "${pageInfo.h1 ?? 'not found'}"
4. Canonical Tag — value: "${pageInfo.canonical ?? 'not found'}"
5. Robots Meta — value: "${pageInfo.robots ?? 'not found'}"
6. Content Quality — analyse the HTML snippet below
7. Image Alt Text — scan for <img> tags missing alt attributes
8. Internal Linking — check for presence of internal links
9. Structured Data — look for JSON-LD or schema markup
10. Mobile Friendliness — check for viewport meta tag

URL: ${url}

HTML snippet (first 12k chars):
${html.slice(0, 8000)}`

    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.text ?? ''
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    let insights = []
    if (jsonMatch) {
      try { insights = JSON.parse(jsonMatch[0]) } catch (_) { /* leave empty */ }
    }

    return res.json({ url, insights, pageInfo })
  } catch (err) {
    console.error('[ai-overview]', err)
    return res.status(500).json({ error: err.message })
  }
}
