'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BookingActionsProps {
  bookingId: string
  showComplete?: boolean
  showCancel?: boolean
}

// Mark-complete / cancel buttons for a confirmed booking. Shared by the
// planner and vendor booking detail pages; each page decides which
// actions apply to that viewer.
export default function BookingActions({
  bookingId,
  showComplete = false,
  showCancel = false,
}: BookingActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<'complete' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function act(action: 'complete' | 'cancel') {
    if (action === 'cancel' && !window.confirm('Cancel this booking? This cannot be undone.')) {
      return
    }
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/${action}`, { method: 'PUT' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Could not ${action} booking.`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} booking.`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {showComplete && (
          <button
            onClick={() => act('complete')}
            disabled={busy !== null}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {busy === 'complete' ? 'Marking…' : 'Mark as completed'}
          </button>
        )}
        {showCancel && (
          <button
            onClick={() => act('cancel')}
            disabled={busy !== null}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel booking'}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
