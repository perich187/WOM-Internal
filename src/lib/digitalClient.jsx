import { createContext, useContext, useState, useEffect } from 'react'

const DigitalClientContext = createContext(null)

export function DigitalClientProvider({ children }) {
  const [selectedClientId, setSelectedClientId] = useState(() => {
    return localStorage.getItem('digital_client_id') ?? null
  })
  const [selectedClient, setSelectedClient] = useState(null)

  useEffect(() => {
    if (selectedClientId) {
      localStorage.setItem('digital_client_id', selectedClientId)
    } else {
      localStorage.removeItem('digital_client_id')
    }
  }, [selectedClientId])

  function selectClient(client) {
    setSelectedClient(client)
    setSelectedClientId(client?.id ?? null)
  }

  return (
    <DigitalClientContext.Provider value={{ selectedClient, selectedClientId, selectClient }}>
      {children}
    </DigitalClientContext.Provider>
  )
}

export function useDigitalClient() {
  return useContext(DigitalClientContext)
}
