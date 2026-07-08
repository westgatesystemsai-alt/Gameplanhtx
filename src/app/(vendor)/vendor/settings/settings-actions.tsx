'use client'

import { useState } from 'react'
import type { VendorTier } from '@/types'

interface SettingsActionsProps {
  currentTier: VendorTier
  hasSubscription: boolean
}

export default function SettingsActions({ currentTier, hasSubscription }: SettingsActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function checkout(tier: 'pro' | 'premium') {
    setLoading(tier)
    setError(null)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not start checkout.')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.')
      setLoading(null)
    }
  }

  async function openPortal() {
    setLoading('portal')
    setError(null)
    try {
      const res = await fetch('/api/subscriptions/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not open billing portal.')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing portal.')
      setLoading(null)
    }
  }

  return (
    <div className="mt-6">
      {hasSubscription ? (
        <button
          onClick={openPortal}
          disabled={loading !== null}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {loading === 'portal' ? 'Opening…' : 'Manage billing'}
        </button>
      ) : (
        <div className="flex flex-wrap gap-3">
          {currentTier !== 'pro' && (
            <button
              onClick={() => checkout('pro')}
              disabled={loading !== null}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading === 'pro' ? 'Redirecting…' : 'Upgrade to Pro — $49/mo'}
            </button>
          )}
          {currentTier !== 'premium' && (
            <button
              onClick={() => checkout('premium')}
              disabled={loading !== null}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading === 'premium' ? 'Redirecting…' : 'Upgrade to Premium — $99/mo'}
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
