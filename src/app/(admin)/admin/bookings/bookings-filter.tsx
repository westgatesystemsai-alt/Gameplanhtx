'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

// Status + event-date-range filter form for the admin bookings table.
// Submits by pushing URL search params, which the server page re-reads.
export default function BookingsFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [from, setFrom] = useState(searchParams.get('from') ?? '')
  const [to, setTo] = useState(searchParams.get('to') ?? '')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`/admin/bookings?${params.toString()}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          Event date from
        </label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          Event date to
        </label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900"
        >
          Filter
        </button>
      </div>
    </form>
  )
}
