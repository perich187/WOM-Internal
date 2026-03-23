import { useWorkspace, WORKSPACES } from '@/lib/workspaces'

export default function WorkspacePlaceholder({ workspaceId }) {
  const ws = WORKSPACES.find(w => w.id === workspaceId)
  if (!ws) return null
  const Icon = ws.Icon

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-[#EDE8DC] p-16 text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ backgroundColor: ws.color + '20' }}
        >
          <Icon size={28} style={{ color: ws.color }} />
        </div>
        <h2 className="text-2xl font-bold text-[#092137] mb-2">{ws.label} Workspace</h2>
        <p className="text-[#092137]/50 mb-6 max-w-sm mx-auto">{ws.description} tools and features are currently being built out.</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: ws.color + '15', color: ws.color }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: ws.color }} />
          Coming Soon
        </div>
      </div>
    </div>
  )
}
