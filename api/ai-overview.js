/**
 * AI Overview — two actions:
 *   GET  /api/ai-overview?url=...               SEO page analysis
 *   POST /api/ai-overview?action=content-ideas  Social content idea generator
 */
import Anthropic from '@anthropic-ai/sdk'

const PLATFORM_TRENDS = {
  instagram: `Instagram 2025 trends:
- Reels 15–60s dominate. Hook must appear in first 1–2 seconds via text overlay or bold visual.
- Lo-fi, authentic aesthetic outperforms polished corporate content.
- Trending audio/sounds are essential for reach.
- Popular formats: "Day in the life", "Get ready with me", educational carousels, before/after reveals.
- Captions should be conversational. Strong CTA in caption.`,

  tiktok: `TikTok 2025 trends:
- Hook in first 1–3 seconds or users scroll. Start with the payoff.
- Fast cuts (every 2–3s), trending sounds, text overlays throughout.
- Raw/authentic wins over polished. Creator-style > brand-style.
- Top formats: POV storytelling, "Tell me without telling me", green screen commentary, "Things I wish I knew", day-in-the-life walkthroughs.
- Strong pattern interrupt in the first frame.`,

  facebook: `Facebook 2025 trends:
- Longer-form video (1–3 min) works for warm audiences. Short Reels for cold.
- Community and local business angle resonates strongly.
- Before/after content, customer testimonials, and behind-the-scenes perform well.
- Paid ads: lead generation carousels, offer-focused creative, social proof headlines.
- Captions with questions drive comments and shares.`,

  linkedin: `LinkedIn 2025 trends:
- Personal story + professional lesson performs best (the "I used to think X, then Y happened" hook).
- Document carousels (swipe posts) get high organic reach.
- Thought leadership with a contrarian or data-backed take.
- Behind-the-scenes of running a business, team culture, wins and failures.
- First line must stop the scroll — no pleasantries, lead with the insight.`,
}

async function handleContentIdeas(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })

  const { platform, contentType, industry, clientName, topic, tone } = req.body ?? {}
  if (!platform || !industry) return res.status(400).json({ error: 'platform and industry required' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const client = new Anthropic({ apiKey })

  const systemPrompt = `You are a senior social media content strategist at Word of Mouth Agency (WOM), an Australian marketing agency. You specialise in creating scroll-stopping, high-converting social media content for SMBs. You understand platform algorithms, human psychology, and what actually gets results — not just likes.`

  const userPrompt = `Generate exactly 3 unique ${contentType ?? 'organic'} content ideas for ${platform} for a ${industry} business${clientName ? ` called "${clientName}"` : ''}.
${topic ? `Focus on this topic/theme: "${topic}"` : ''}
${tone ? `Preferred tone: ${tone}` : ''}

${PLATFORM_TRENDS[platform.toLowerCase()] ?? ''}

Return ONLY a raw JSON array (no markdown, no explanation). Each object must have exactly:
{
  "id": number,
  "title": "short catchy content concept title",
  "angle": "one sentence describing the creative angle/approach",
  "tone": "one of: Educational | Humorous | Inspirational | Behind-the-scenes | Promotional | Storytelling | Trending",
  "hook": "the exact opening line or visual description for the first 1-3 seconds",
  "duration": "e.g. 30 seconds | 60 seconds | 2 minutes | Carousel (7 slides)",
  "storyboard": [
    { "scene": 1, "visual": "what the viewer sees", "audio": "what is said or heard", "duration": "5s" }
  ],
  "script": "full word-for-word script with scene cues in [brackets]. Write exactly what would be spoken on camera or in voiceover.",
  "hashtags": ["#tag1", "#tag2"],
  "musicMood": "description of ideal background music/audio vibe",
  "cta": "the specific call-to-action"
}

Make each idea distinct — different angles, tones, and formats. Write scripts in Australian English. Be specific and actionable, not generic.`

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      messages:   [{ role: 'user', content: userPrompt }],
      system:     systemPrompt,
    })

    const text = message.content[0]?.text ?? ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    let ideas = []
    if (jsonMatch) {
      try { ideas = JSON.parse(jsonMatch[0]) } catch (_) { /* leave empty */ }
    }

    return res.status(200).json({ ok: true, ideas, platform, contentType, industry })
  } catch (err) {
    console.error('[content-ideas]', err)
    return res.status(500).json({ error: err.message })
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.query.action === 'content-ideas') return handleContentIdeas(req, res)

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
