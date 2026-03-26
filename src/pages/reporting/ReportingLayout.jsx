import { useState, useRef, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { ChevronDown, Building2, X } from 'lucide-react'
import { ReportingClientProvider, useReportingClient } from '@/lib/reportingClient'
import { useClients } from '@/lib/hooks'

function ReportingClientSelector() {
  const { data: clients = [] } = useClients()
  const { selectedClient, selectedClientId, selectClient } = useReportingClient()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (selectedClientId && clients.length && !selectedClient) {
      const found = clients.find(c => c.id === selectedClientId)
      if (found) selectClient(found)
    }
  }, [clients, selectedClientId, selectedClient, selectClient])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-white border-b border-[#EDE8DC] px-6 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm text-[#092137]/50 flex-shrink-0">
        <Building2 size={15} />
        <span className="font-medium">Client:</span>
      </div>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#EDE8DC] bg-white hover:bg-[#F5F1E9] transition-colors text-sm"
        >
          {selectedClient ? (
            <>
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedClient.color ?? '#F0A629' }}
              />
              <span className="font-medium text-[#092137]">{selectedClient.client_name}</span>
            </>
          ) : (
            <span className="text-[#092137]/40">All clients</span>
          )}
          <ChevronDown size={14} className="text-[#092137]/40 ml-1" />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl border border-[#EDE8DC] shadow-lg z-50 py-1 overflow-hidden">
            <button
              onClick={() => { selectClient(null); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#F5F1E9] transition-colors text-left text-[#092137]/50"
            >
              All clients
            </button>
            {clients.map(client => (
              <button
                key={client.id}
                onClick={() => { selectClient(client); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#F5F1E9] transition-colors text-left ${selectedClient?.id === client.id ? 'bg-orange-50' : ''}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: client.color ?? '#F0A629' }}
                />
                <span className="font-medium text-[#092137] truncate">{client.client_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedClient && (
        <button
          onClick={() => selectClient(null)}
          className="ml-auto flex items-center gap-1 text-xs text-[#092137]/40 hover:text-[#092137]/70 transition-colors"
        >
          <X size={13} /> Clear
        </button>
      )}
    </div>
  )
}

export default function ReportingLayout() {
  return (
    <ReportingClientProvider>
      <div className="-mx-6 -mt-6">
        <ReportingClientSelector />
      </div>
      <div className="pt-6">
        <Outlet />
      </div>
    </ReportingClientProvider>
  )
}
