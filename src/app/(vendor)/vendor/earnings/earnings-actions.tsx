'use client'

import { useState } from 'react'
import Link from 'next/link'

interface EarningsActionsProps {
  onboarded: boolean
}

export default function EarningsActions({ onboarded }: EarningsActionsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openDashboard() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/connect/dashboard-link')
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not open Stripe dashboard.')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open Stripe dashboard.')
      setLoading(false)
    }
  }

  if (!onboarded) {
    return (
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Connect your Stripe account to view payout details.{' '}
        <Link href="/vendor/connect" className="font-medium text-blue-600 hover:underline">
          Connect now
        </Link>
      </p>
    )
  }

  return (
    <div className="mt-4">
      <button
        onClick={openDashboard}
        disabled={loading}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {loading ? 'Opening…' : 'View Stripe Dashboard'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
