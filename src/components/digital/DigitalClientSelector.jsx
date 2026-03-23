import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, Globe, X } from 'lucide-react'
import { useClients } from '@/lib/hooks'
import { useDigitalClient } from '@/lib/digitalClient'

export default function DigitalClientSelector() {
  const { data: clients = [] } = useClients()
  const { selectedClient, selectedClientId, selectClient } = useDigitalClient()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Sync selectedClient object when clients load (restoring from localStorage)
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
                style={{ backgroundColor: selectedClient.color ?? '#3B82F6' }}
              />
              <span className="font-medium text-[#092137]">{selectedClient.client_name}</span>
            </>
          ) : (
            <span className="text-[#092137]/40">Select a client…</span>
          )}
          <ChevronDown size={14} className="text-[#092137]/40 ml-1" />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl border border-[#EDE8DC] shadow-lg z-50 py-1 overflow-hidden">
            {clients.length === 0 && (
              <p className="px-4 py-3 text-sm text-[#092137]/40">No clients found</p>
            )}
            {clients.map(client => (
              <button
                key={client.id}
                onClick={() => { selectClient(client); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#F5F1E9] transition-colors text-left ${selectedClient?.id === client.id ? 'bg-blue-50' : ''}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: client.color ?? '#3B82F6' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#092137] truncate">{client.client_name}</p>
                  {client.website && (
                    <p className="text-xs text-[#092137]/40 truncate">{client.website}</p>
                  )}
                </div>
                {selectedClient?.id === client.id && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Website chip */}
      {selectedClient?.website && (
        <a
          href={selectedClient.website.startsWith('http') ? selectedClient.website : `https://${selectedClient.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Globe size={13} />
          <span className="truncate max-w-[180px]">{selectedClient.website}</span>
        </a>
      )}

      {/* Clear */}
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
