import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_name, industry, status, color, website, notes')
        .order('client_name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clientName, industry, website, notes, status }) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({ client_name: clientName, industry, website, notes, status: status ?? 'Active' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('clients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useClient(id) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_name, industry, status')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// ─── SOCIAL ACCOUNTS ─────────────────────────────────────────────────────────

export function useSocialAccounts(clientId) {
  return useQuery({
    queryKey: ['social_accounts', clientId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('social_accounts')
        .select('*, clients(client_name, industry)')
        .order('platform')
      if (clientId) query = query.eq('client_id', clientId)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    staleTime: 0,          // always consider stale so it refetches on mount
    refetchOnMount: true,
  })
}

export function useConnectAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clientId, platform, username, followers }) => {
      const { data, error } = await supabase
        .from('social_accounts')
        .upsert({
          client_id: clientId,
          platform,
          username,
          followers: followers ?? 0,
          connected: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id,platform' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social_accounts'] }),
  })
}

export function useDisconnectAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (accountId) => {
      const { error } = await supabase
        .from('social_accounts')
        .update({ connected: false, access_token: null, refresh_token: null, updated_at: new Date().toISOString() })
        .eq('id', accountId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social_accounts'] }),
  })
}

export function useMetaPendingSession(sessionId) {
  return useQuery({
    queryKey: ['meta_pending', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_oauth_pending')
        .select('*')
        .eq('id', sessionId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!sessionId,
  })
}

export function useConfirmMetaPages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, clientId, selectedPages }) => {
      // selectedPages: array of { fb_page_id, fb_page_name, fb_token, ig_user_id, ig_username, ig_followers }
      const upserts = []
      for (const page of selectedPages) {
        upserts.push({
          client_id:        clientId,
          platform:         'facebook',
          account_name:     page.fb_page_name,
          platform_user_id: page.fb_page_id,
          access_token:     page.fb_token,
          connected:        true,
          updated_at:       new Date().toISOString(),
        })
        if (page.ig_user_id) {
          upserts.push({
            client_id:        clientId,
            platform:         'instagram',
            username:         page.ig_username ?? null,
            account_name:     page.ig_username ?? page.fb_page_name,
            platform_user_id: page.ig_user_id,
            followers:        page.ig_followers ?? 0,
            access_token:     page.fb_token,
            connected:        true,
            updated_at:       new Date().toISOString(),
          })
        }
      }
      const { error: upsertErr } = await supabase
        .from('social_accounts')
        .upsert(upserts, { onConflict: 'client_id,platform' })
      if (upsertErr) throw upsertErr
      // Clean up pending session
      await supabase.from('meta_oauth_pending').delete().eq('id', sessionId)
      return upserts.length
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social_accounts'] })
      qc.invalidateQueries({ queryKey: ['meta_pending'] })
    },
  })
}

// ─── SOCIAL POSTS ─────────────────────────────────────────────────────────────

export function useSocialPosts({ clientId, status } = {}) {
  return useQuery({
    queryKey: ['social_posts', clientId ?? 'all', status ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('social_posts')
        .select('*, clients(client_name, industry)')
        .order('scheduled_at', { ascending: true, nullsFirst: false })
      if (clientId) query = query.eq('client_id', clientId)
      if (status) query = query.eq('status', status)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: async ({ file, clientId }) => {
      const ext  = file.name.split('.').pop()
      const path = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('social-media')
        .upload(path, file, { upsert: false })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(path)
      return { url: publicUrl, path }
    },
  })
}

export function useDeleteMedia() {
  return useMutation({
    mutationFn: async (path) => {
      const { error } = await supabase.storage.from('social-media').remove([path])
      if (error) throw error
    },
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clientId, platforms, content, status, scheduledAt, createdByName, mediaUrls, firstComment }) => {
      const { data, error } = await supabase
        .from('social_posts')
        .insert({
          client_id: clientId,
          platforms,
          content,
          status,
          scheduled_at: scheduledAt ?? null,
          created_by_name: createdByName,
          media_urls: mediaUrls ?? [],
          first_comment: firstComment ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social_posts'] })
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] })
    },
  })
}

export function usePublishNow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (postId) => {
      const appUrl     = import.meta.env.VITE_APP_URL ?? ''
      const internalKey = import.meta.env.VITE_INTERNAL_API_KEY ?? ''
      const res = await fetch(`${appUrl}/api/publish-post?postId=${postId}`, {
        method:  'POST',
        headers: { 'x-internal-key': internalKey },
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Publish failed')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social_posts'] })
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] })
    },
  })
}

export function useUpdatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('social_posts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social_posts'] }),
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('social_posts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social_posts'] }),
  })
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export function usePostAnalytics(postId) {
  return useQuery({
    queryKey: ['post_analytics', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_post_analytics')
        .select('*')
        .eq('post_id', postId)
        .order('recorded_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!postId,
  })
}

export function useAggregateAnalytics(clientId) {
  return useQuery({
    queryKey: ['aggregate_analytics', clientId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('social_post_analytics')
        .select('platform, likes, comments, shares, reach, impressions, social_posts!inner(client_id)')
      if (clientId) {
        query = query.eq('social_posts.client_id', clientId)
      }
      const { data, error } = await query
      if (error) throw error

      // Aggregate by platform
      const byPlatform = {}
      data.forEach(row => {
        if (!byPlatform[row.platform]) {
          byPlatform[row.platform] = { platform: row.platform, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0, engagement: 0 }
        }
        byPlatform[row.platform].likes += row.likes
        byPlatform[row.platform].comments += row.comments
        byPlatform[row.platform].shares += row.shares
        byPlatform[row.platform].reach += row.reach
        byPlatform[row.platform].impressions += row.impressions
        byPlatform[row.platform].engagement += row.likes + row.comments + row.shares
      })

      return {
        byPlatform: Object.values(byPlatform),
        totals: {
          reach: data.reduce((s, r) => s + r.reach, 0),
          engagement: data.reduce((s, r) => s + r.likes + r.comments + r.shares, 0),
          likes: data.reduce((s, r) => s + r.likes, 0),
          comments: data.reduce((s, r) => s + r.comments, 0),
          shares: data.reduce((s, r) => s + r.shares, 0),
        },
      }
    },
  })
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const [clientsRes, postsRes, accountsRes] = await Promise.all([
        supabase.from('clients').select('id, status', { count: 'exact' }).eq('status', 'Active'),
        supabase.from('social_posts').select('id, status', { count: 'exact' }),
        supabase.from('social_accounts').select('id, connected', { count: 'exact' }).eq('connected', true),
      ])

      const scheduledCount = postsRes.data?.filter(p => p.status === 'scheduled').length ?? 0
      const publishedCount = postsRes.data?.filter(p => p.status === 'published').length ?? 0

      return {
        activeClients: clientsRes.count ?? 0,
        scheduledPosts: scheduledCount,
        publishedPosts: publishedCount,
        connectedAccounts: accountsRes.count ?? 0,
      }
    },
  })
}

// ─── INFLUENCERS ─────────────────────────────────────────────────────────────

export function useInfluencers() {
  return useQuery({
    queryKey: ['influencers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('influencers')
        .select('*')
        .order('score', { ascending: false, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateInfluencer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('influencers')
        .insert({ ...payload, source: payload.source ?? 'manual' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['influencers'] }),
  })
}

export function useUpdateInfluencer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('influencers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['influencers'] }),
  })
}

export function useDeleteInfluencer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('influencers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['influencers'] }),
  })
}

export function useBulkInsertInfluencers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rows) => {
      if (!rows?.length) return { inserted: 0, skipped: 0 }
      // Dedupe client-side against existing handles so we don't hit the unique index.
      const { data: existing } = await supabase
        .from('influencers')
        .select('instagram_handle, tiktok_handle, facebook_handle')
      const seen = new Set()
      ;(existing ?? []).forEach(e => {
        if (e.instagram_handle) seen.add('ig:' + e.instagram_handle.toLowerCase())
        if (e.tiktok_handle)    seen.add('tt:' + e.tiktok_handle.toLowerCase())
        if (e.facebook_handle)  seen.add('fb:' + e.facebook_handle.toLowerCase())
      })
      const fresh = rows.filter(r => {
        if (r.instagram_handle && seen.has('ig:' + r.instagram_handle.toLowerCase())) return false
        if (r.tiktok_handle    && seen.has('tt:' + r.tiktok_handle.toLowerCase()))    return false
        if (r.facebook_handle  && seen.has('fb:' + r.facebook_handle.toLowerCase()))  return false
        return true
      })
      if (!fresh.length) return { inserted: 0, skipped: rows.length }
      const { error } = await supabase.from('influencers').insert(fresh)
      if (error) throw error
      return { inserted: fresh.length, skipped: rows.length - fresh.length }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['influencers'] }),
  })
}

export function useDiscoverInfluencers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ platform, query, limit }) => {
      const res = await fetch('/api/influencers?action=discover', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ platform, query, limit }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Discovery failed')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['influencers'] }),
  })
}

// ─── INFLUENCER CAMPAIGNS ────────────────────────────────────────────────────

export function useInfluencerCampaigns() {
  return useQuery({
    queryKey: ['influencer_campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('influencer_campaigns')
        .select('*, clients(client_name), campaign_influencers(id)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useInfluencerCampaign(id) {
  return useQuery({
    queryKey: ['influencer_campaigns', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('influencer_campaigns')
        .select('*, clients(id, client_name), campaign_influencers(*, influencers(*))')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('influencer_campaigns')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['influencer_campaigns'] }),
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('influencer_campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['influencer_campaigns'] })
      qc.invalidateQueries({ queryKey: ['influencer_campaigns', id] })
    },
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('influencer_campaigns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['influencer_campaigns'] }),
  })
}

export function useAddInfluencersToCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, influencerIds }) => {
      const rows = influencerIds.map(influencer_id => ({
        campaign_id: campaignId,
        influencer_id,
      }))
      const { data, error } = await supabase
        .from('campaign_influencers')
        .upsert(rows, { onConflict: 'campaign_id,influencer_id', ignoreDuplicates: true })
        .select()
      if (error) throw error
      return data
    },
    onSuccess: (_, { campaignId }) => {
      qc.invalidateQueries({ queryKey: ['influencer_campaigns'] })
      qc.invalidateQueries({ queryKey: ['influencer_campaigns', campaignId] })
    },
  })
}

export function useUpdateCampaignInfluencer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('campaign_influencers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['influencer_campaigns'] }),
  })
}

export function useRemoveCampaignInfluencer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('campaign_influencers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['influencer_campaigns'] }),
  })
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

export function useProfile(userId) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}
