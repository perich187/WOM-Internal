import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Clock, Loader2 } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO,
} from 'date-fns'
import { useClients, useSocialPosts, useDeletePost } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import PlatformIcon from '@/components/ui/PlatformIcon'
import { toast } from 'sonner'

const VIEW_OPTIONS = ['month', 'list']

const STATUS_DOT = {
  scheduled: 'bg-wom-cyan',
  published: 'bg-wom-teal',
  draft: 'bg-gray-400',
  failed: 'bg-wom-red',
}

function PostPill({ post, onClick }) {
  const clientName = post.clients?.client_name ?? '—'
  return (
    <button
      onClick={() => onClick(post)}
      className={cn(
        'w-full text-left text-xs px-2 py-1 rounded-md flex items-center gap-1.5 truncate transition-colors',
        post.status === 'scheduled' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' :
        post.status === 'published' ? 'bg-green-50 text-green-700 hover:bg-green-100' :
        post.status === 'draft' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' :
        'bg-red-50 text-red-600 hover:bg-red-100'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[post.status])} />
      <span className="truncate">{clientName}</span>
      <div className="flex gap-0.5 ml-auto">
        {(post.platforms ?? []).slice(0, 2).map(p => <PlatformIcon key={p} platform={p} size={12} />)}
      </div>
    </button>
  )
}

function PostDetailModal({ post, onClose }) {
  const deleteMutation = useDeletePost()
  if (!post) return null
  const clientName = post.clients?.client_name ?? '—'

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    try {
      await deleteMutation.mutateAsync(post.id)
      toast.success('Post deleted')
      onClose()
    } catch {
      toast.error('Failed to delete post')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">{clientName}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
              post.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
              post.status === 'published' ? 'bg-green-50 text-green-700' :
              'bg-gray-100 text-gray-600'
            )}>{post.status}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2">×</button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          {(post.platforms ?? []).map(p => <PlatformIcon key={p} platform={p} size={22} />)}
        </div>

        <p className="text-sm text-gray-700 mb-4 leading-relaxed">{post.content}</p>

        {post.scheduled_at && (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-4">
            <Clock size={14} />
            {format(parseISO(post.scheduled_at), 'EEEE d MMMM yyyy · h:mm a')}
          </div>
        )}

        {post.created_by_name && (
          <p className="text-xs text-gray-400 mb-4">Created by {post.created_by_name}</p>
        )}

        <div className="flex gap-3">
          <button onClick={handleDelete} disabled={deleteMutation.isPending} className="btn-danger">
            {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Delete'}
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
        </div>
      </div>
    </div>
  )
}

function MonthView({ currentDate, posts, onPostClick, onAddClick }) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })
  const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEK_DAYS.map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayPosts = posts.filter(p => p.scheduled_at && isSameDay(parseISO(p.scheduled_at), day))
          const isCurrentMonth = isSameMonth(day, currentDate)
          return (
            <div
              key={idx}
              className={cn(
                'min-h-[100px] p-2 border-b border-r border-gray-50 relative group',
                !isCurrentMonth && 'bg-gray-50/50',
                isToday(day) && 'bg-[#FEF8EC]/60'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  'w-6 h-6 flex items-center justify-center text-xs rounded-full font-medium',
                  isToday(day) ? 'bg-wom-purple text-[#092137]' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                )}>
                  {format(day, 'd')}
                </span>
                <button
                  onClick={() => onAddClick(day)}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-wom-purple text-[#092137] flex items-center justify-center transition-opacity"
                >
                  <Plus size={10} />
                </button>
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, 3).map(post => (
                  <PostPill key={post.id} post={post} onClick={onPostClick} />
                ))}
                {dayPosts.length > 3 && (
                  <button className="w-full text-center text-xs text-gray-400 hover:text-wom-purple">
                    +{dayPosts.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListView({ posts, onPostClick }) {
  const sorted = [...posts].filter(p => p.scheduled_at).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
        <Clock size={36} className="mx-auto mb-3 opacity-30" />
        <p>No scheduled posts.</p>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
      {sorted.map(post => {
        const clientName = post.clients?.client_name ?? '—'
        return (
          <div key={post.id} onClick={() => onPostClick(post)} className="flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="text-center flex-shrink-0 w-14">
              <p className="text-xs font-bold text-wom-purple">{format(parseISO(post.scheduled_at), 'MMM').toUpperCase()}</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">{format(parseISO(post.scheduled_at), 'd')}</p>
              <p className="text-xs text-gray-400">{format(parseISO(post.scheduled_at), 'h:mm a')}</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{clientName}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  post.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                  post.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                )}>{post.status}</span>
                <div className="flex gap-1 ml-auto">{(post.platforms ?? []).map(p => <PlatformIcon key={p} platform={p} size={16} />)}</div>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
              {post.created_by_name && <p className="text-xs text-gray-400 mt-1">By {post.created_by_name}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Calendar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientFilter = searchParams.get('client')

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month')
  const [selectedPost, setSelectedPost] = useState(null)
  const [filterClient, setFilterClient] = useState(clientFilter ?? 'all')

  const { data: clients } = useClients()
  const { data: posts, isLoading } = useSocialPosts({ clientId: filterClient !== 'all' ? filterClient : undefined })

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold text-gray-900 w-40 text-center">{format(currentDate, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs text-wom-purple border border-wom-purple/30 px-3 py-1.5 rounded-full hover:bg-[#FEF8EC] transition-colors">
            Today
          </button>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <select
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="text-sm border border-gray-200 rounded-full px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-wom-purple/30"
          >
            <option value="all">All Clients</option>
            {(clients ?? []).map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
          </select>

          <div className="flex bg-gray-100 rounded-full p-0.5 gap-0.5">
            {VIEW_OPTIONS.map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-all',
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <button onClick={() => navigate('/compose')} className="btn-primary text-sm">
            <Plus size={15} /> New Post
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {[{ label: 'Scheduled', cls: 'bg-wom-cyan' }, { label: 'Published', cls: 'bg-wom-teal' }, { label: 'Draft', cls: 'bg-gray-400' }, { label: 'Failed', cls: 'bg-wom-red' }].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1.5"><span className={cn('w-2 h-2 rounded-full', cls)} />{label}</span>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading posts...
        </div>
      ) : view === 'month' ? (
        <MonthView currentDate={currentDate} posts={posts ?? []} onPostClick={setSelectedPost} onAddClick={() => navigate('/compose')} />
      ) : (
        <ListView posts={posts ?? []} onPostClick={setSelectedPost} />
      )}

      {selectedPost && <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
    </div>
  )
}
