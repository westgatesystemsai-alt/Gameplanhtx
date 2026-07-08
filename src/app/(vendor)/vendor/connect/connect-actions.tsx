'use client'

import { useState } from 'react'

interface Props {
  onboarded: boolean
  hasAccount: boolean
}

// Buttons for the Connect page: start/continue onboarding, or open the
// Stripe Express dashboard once connected.
export default function ConnectActions({ onboarded, hasAccount }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go(path: string, method: 'GET' | 'POST') {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(path, { method })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Something went wrong.')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="mt-6">
      {onboarded ? (
        <button
          onClick={() => go('/api/connect/dashboard-link', 'GET')}
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Opening…' : 'View Stripe Dashboard'}
        </button>
      ) : (
        <button
          onClick={() => go('/api/connect/onboard', 'POST')}
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading
            ? 'Redirecting…'
            : hasAccount
              ? 'Continue Stripe Setup'
              : 'Connect Stripe Account'}
        </button>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
