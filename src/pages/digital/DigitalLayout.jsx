import { Outlet } from 'react-router-dom'
import { DigitalClientProvider } from '@/lib/digitalClient'
import DigitalClientSelector from '@/components/digital/DigitalClientSelector'

export default function DigitalLayout() {
  return (
    <DigitalClientProvider>
      {/* Break out of parent p-6 for the selector bar, then restore padding */}
      <div className="-mx-6 -mt-6">
        <DigitalClientSelector />
      </div>
      <div className="pt-6">
        <Outlet />
      </div>
    </DigitalClientProvider>
  )
}
