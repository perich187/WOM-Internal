import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Check } from 'lucide-react'
import { WORKSPACES, useWorkspace } from '@/lib/workspaces'
import WOMLogoMark from '@/components/ui/WOMLogoMark'
import { cn } from '@/lib/utils'

export default function WorkspaceSwitcher({ collapsed }) {
  const { workspace, switchWorkspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (ws) => {
    switchWorkspace(ws.id)
    navigate(ws.homeRoute)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-4 h-16 transition-colors hover:bg-white/10',
          collapsed && 'justify-center px-0'
        )}
        style={{ borderBottom: '1px solid rgba(245,241,233,0.1)' }}
      >
        {/* WOM icon */}
        <div className="flex-shrink-0">
          <WOMLogoMark variant="icon" height={28} white />
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5">
                {/* Coloured workspace dot */}
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: workspace.color }}
                />
                <p className="text-sm font-bold text-[#F5F1E9] truncate leading-tight">
                  {workspace.label}
                </p>
              </div>
              <p className="text-[10px] leading-tight truncate" style={{ color: 'rgba(245,241,233,0.45)' }}>
                {workspace.description}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={cn('flex-shrink-0 transition-transform', open && 'rotate-180')}
              style={{ color: 'rgba(245,241,233,0.4)' }}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-56 bg-[#0d2d45] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
          style={{ minWidth: collapsed ? 220 : '100%', left: collapsed ? '100%' : 0, top: collapsed ? '50%' : '100%', transform: collapsed ? 'translateY(-50%)' : 'none', marginLeft: collapsed ? 8 : 0, marginTop: collapsed ? 0 : 4 }}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold px-3 py-2" style={{ color: 'rgba(245,241,233,0.3)' }}>
            Switch Workspace
          </p>
          {WORKSPACES.map(ws => {
            const Icon = ws.Icon
            const isActive = workspace.id === ws.id
            return (
              <button
                key={ws.id}
                onClick={() => handleSelect(ws)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 transition-colors text-left"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: ws.color + '25', border: `1px solid ${ws.color}40` }}
                >
                  <Icon size={14} style={{ color: ws.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F5F1E9] leading-tight">{ws.label}</p>
                  <p className="text-[10px] leading-tight" style={{ color: 'rgba(245,241,233,0.4)' }}>{ws.description}</p>
                </div>
                {isActive && <Check size={13} style={{ color: ws.color }} className="flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
