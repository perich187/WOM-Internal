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
