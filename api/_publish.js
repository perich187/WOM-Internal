/**
 * Shared publishing logic — called by both /api/publish-post and /api/cron-publish.
 * Not exposed as an API route (underscore prefix).
 *
 * Supports:
 *   - Facebook Pages  (text, single image, multi-image carousel)
 *   - Instagram Business (single image, carousel; text-only not supported by Meta API)
 */

import { createClient } from '@supabase/supabase-js'

const GRAPH = 'https://graph.facebook.com/v19.0'

function supabaseAdmin() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function graphPost(path, body) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(body)) {
    params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
  }
  const res  = await fetch(`${GRAPH}${path}`, { method: 'POST', body: params })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

/** Poll until IG container is FINISHED (or throws on ERROR / timeout). */
async function waitForIgContainer(containerId, token, maxTries = 12) {
  for (let i = 0; i < maxTries; i++) {
    const res  = await fetch(`${GRAPH}/${containerId}?fields=status_code&access_token=${token}`)
    const data = await res.json()
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR')    throw new Error('Instagram media container processing failed')
    await new Promise(r => setTimeout(r, 3000))
  }
  throw new Error('Instagram media container timed out after 36s')
}

// ── Facebook ──────────────────────────────────────────────────────────────────

async function postToFacebook({ pageId, pageToken, content, mediaUrls }) {
  const images = (mediaUrls ?? []).filter(u => !u.match(/\.(mp4|mov|mpeg)$/i))

  // Upload each image as an unpublished Page photo, collect their IDs
  const photoIds = []
  for (const url of images) {
    const photo = await graphPost(`/${pageId}/photos`, {
      url,
      published:    false,
      access_token: pageToken,
    })
    photoIds.push(photo.id)
  }

  // Build feed post body
  const feedBody = { message: content, access_token: pageToken }
  photoIds.forEach((id, i) => {
    feedBody[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })
  })

  const feed = await graphPost(`/${pageId}/feed`, feedBody)
  return feed.id
}

// ── Instagram ─────────────────────────────────────────────────────────────────

async function postToInstagram({ igUserId, pageToken, content, mediaUrls, firstComment }) {
  const images = (mediaUrls ?? []).filter(u => !u.match(/\.(mp4|mov|mpeg)$/i))

  if (images.length === 0) {
    throw new Error(
      'Instagram requires at least one image. Text-only posts are not supported by the Instagram Content Publishing API.',
    )
  }

  let creationId

  if (images.length === 1) {
    // Single image
    const container = await graphPost(`/${igUserId}/media`, {
      image_url:    images[0],
      caption:      content,
      access_token: pageToken,
    })
    creationId = container.id
    await waitForIgContainer(creationId, pageToken)
  } else {
    // Carousel — upload each item, then create carousel container
    const itemIds = []
    for (const url of images.slice(0, 10)) { // IG max 10 carousel items
      const item = await graphPost(`/${igUserId}/media`, {
        image_url:        url,
        is_carousel_item: true,
        access_token:     pageToken,
      })
      await waitForIgContainer(item.id, pageToken)
      itemIds.push(item.id)
    }

    const carousel = await graphPost(`/${igUserId}/media`, {
      media_type:   'CAROUSEL',
      children:     itemIds.join(','),
      caption:      content,
      access_token: pageToken,
    })
    creationId = carousel.id
  }

  // Publish the container
  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id:  creationId,
    access_token: pageToken,
  })
  const postId = published.id

  // Post first comment (non-fatal if it fails)
  if (firstComment) {
    try {
      await graphPost(`/${postId}/comments`, {
        message:      firstComment,
        access_token: pageToken,
      })
    } catch (err) {
      console.warn('[publish] first comment failed (non-fatal):', err.message)
    }
  }

  return postId
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Publishes a single post to all its selected platforms.
 * Updates the post row in Supabase with the result.
 *
 * @param {string} postId  UUID of the social_posts row
 * @returns {{ platformResults: Record<string,{success?:true,externalId?:string,error?:string}> }}
 */
export async function publishPost(postId) {
  const db = supabaseAdmin()

  // Load post
  const { data: post, error: postErr } = await db
    .from('social_posts')
    .select('*')
    .eq('id', postId)
    .single()
  if (postErr) throw new Error(`Post not found: ${postErr.message}`)

  const platformResults = {}
  let hasSuccess = false

  for (const platform of post.platforms) {
    // Look up connected account token
    const { data: account } = await db
      .from('social_accounts')
      .select('platform_user_id, access_token')
      .eq('client_id', post.client_id)
      .eq('platform', platform)
      .eq('connected', true)
      .single()

    if (!account?.access_token) {
      platformResults[platform] = { error: 'No connected account — please reconnect in Connected Accounts.' }
      continue
    }

    try {
      let externalId

      if (platform === 'facebook') {
        externalId = await postToFacebook({
          pageId:    account.platform_user_id,
          pageToken: account.access_token,
          content:   post.content,
          mediaUrls: post.media_urls,
        })
      } else if (platform === 'instagram') {
        externalId = await postToInstagram({
          igUserId:     account.platform_user_id,
          pageToken:    account.access_token,
          content:      post.content,
          mediaUrls:    post.media_urls,
          firstComment: post.first_comment,
        })
      } else {
        platformResults[platform] = { error: `${platform} auto-posting not yet supported.` }
        continue
      }

      platformResults[platform] = { success: true, externalId }
      hasSuccess = true
    } catch (err) {
      console.error(`[publish] ${platform} error for post ${postId}:`, err.message)
      platformResults[platform] = { error: err.message }
    }
  }

  const allFailed   = Object.values(platformResults).every(r => r.error)
  const errorSummary = allFailed
    ? Object.entries(platformResults).map(([p, r]) => `${p}: ${r.error}`).join(' | ')
    : null

  // Update post status in DB
  await db
    .from('social_posts')
    .update({
      status:        allFailed ? 'failed' : 'published',
      published_at:  hasSuccess ? new Date().toISOString() : null,
      error_message: errorSummary,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', postId)

  return { platformResults }
}
