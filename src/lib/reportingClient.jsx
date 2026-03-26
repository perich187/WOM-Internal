import { createContext, useContext, useState, useEffect } from 'react'

const ReportingClientContext = createContext(null)

export function ReportingClientProvider({ children }) {
  const [selectedClientId, setSelectedClientId] = useState(() => {
    return localStorage.getItem('reporting_client_id') ?? null
  })
  const [selectedClient, setSelectedClient] = useState(null)

  useEffect(() => {
    if (selectedClientId) {
      localStorage.setItem('reporting_client_id', selectedClientId)
    } else {
      localStorage.removeItem('reporting_client_id')
    }
  }, [selectedClientId])

  function selectClient(client) {
    setSelectedClient(client)
    setSelectedClientId(client?.id ?? null)
  }

  return (
    <ReportingClientContext.Provider value={{ selectedClient, selectedClientId, selectClient }}>
      {children}
    </ReportingClientContext.Provider>
  )
}

export function useReportingClient() {
  return useContext(ReportingClientContext)
}
