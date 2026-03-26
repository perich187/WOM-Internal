import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, CalendarDays, Link2, Pencil, Trash2, BarChart3, Copy, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useReportingClient } from '@/lib/reportingClient'
import { toast } from 'sonner'

function formatDateRange(from, to) {
  if (!from && !to) return 'No date range'
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  if (from && to) return `${fmt(from)} – ${fmt(to)}`
  if (from) return `From ${fmt(from)}`
  return `To ${fmt(to)}`
}

function ReportCard({ report, onDelete, onCopied }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  function copyLink() {
    const url = `${window.location.origin}/report/${report.share_token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopied?.()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${report.title}"? This cannot be undone.`)) return
    const { error } = await supabase.from('reports').delete().eq('id', report.id)
    if (error) { toast.error(error.message); return }
    toast.success('Report deleted')
    onDelete(report.id)
  }

  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] p-5 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-orange-500" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[#092137] truncate">{report.title}</h3>
            {report.client_name && (
              <p className="text-xs text-[#092137]/50 truncate">{report.client_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={copyLink}
            title="Copy share link"
            className="w-7 h-7 rounded-lg bg-[#F5F1E9] flex items-center justify-center text-[#092137]/40 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            {copied ? <Check size={14} /> : <Link2 size={14} />}
          </button>
          <button
            onClick={() => navigate(`/reporting/builder/${report.id}`)}
            title="Edit report"
            className="w-7 h-7 rounded-lg bg-[#F5F1E9] flex items-center justify-center text-[#092137]/40 hover:text-[#092137] hover:bg-[#EDE8DC] transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            title="Delete report"
            className="w-7 h-7 rounded-lg bg-[#F5F1E9] flex items-center justify-center text-[#092137]/40 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-[#092137]/40">
        <span className="flex items-center gap-1">
          <CalendarDays size={12} />
          {formatDateRange(report.date_from, report.date_to)}
        </span>
        <span>·</span>
        <span>{(report.sections || []).length} section{report.sections?.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="mt-4 pt-3 border-t border-[#EDE8DC] flex items-center gap-2">
        <button
          onClick={() => navigate(`/reporting/builder/${report.id}`)}
          className="flex-1 py-1.5 text-xs font-medium text-[#092137]/60 hover:text-[#092137] hover:bg-[#F5F1E9] rounded-lg transition-colors"
        >
          Edit
        </button>
        <button
          onClick={copyLink}
          className="flex-1 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          {copied ? <><Check size={12} /> Copied!</> : <><Link2 size={12} /> Share Link</>}
        </button>
      </div>
    </div>
  )
}

export default function ReportingHome() {
  const navigate = useNavigate()
  const { selectedClient, selectedClientId } = useReportingClient()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let query = supabase
      .from('reports')
      .select('id, client_id, client_name, title, date_from, date_to, sections, share_token, created_at')
      .order('created_at', { ascending: false })
    if (selectedClientId) query = query.eq('client_id', selectedClientId)

    query.then(({ data, error }) => {
      if (!error) setReports(data || [])
      setLoading(false)
    })
  }, [selectedClientId])

  function handleDelete(id) {
    setReports(r => r.filter(x => x.id !== id))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Reports</h1>
              <p className="text-orange-100 text-sm">Client reporting — build, share, impress</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/reporting/builder/new')}
            className="flex items-center gap-2 bg-white text-orange-600 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-orange-50 transition-colors shadow-sm"
          >
            <Plus size={16} />
            New Report
          </button>
        </div>
      </div>

      {/* Reports grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-16 text-center">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#092137] mb-2">No reports yet</h3>
          <p className="text-[#092137]/50 text-sm mb-6">
            {selectedClient
              ? `No reports for ${selectedClient.client_name} yet.`
              : 'Create your first report to get started.'}
          </p>
          <button
            onClick={() => navigate('/reporting/builder/new')}
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} />
            Create Report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onDelete={handleDelete}
              onCopied={() => toast.success('Share link copied!')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
