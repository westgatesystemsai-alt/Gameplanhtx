'use client'

import { useState } from 'react'
import { Calendar, Users } from 'lucide-react'
import type { Quote, QuoteStatus } from '@/types'
import QuotePayment from './QuotePayment'

interface QuoteCardProps {
  quote: Quote
  /** Planner sees Accept/Decline + payment; vendor sees status only. */
  viewer: 'planner' | 'vendor'
  serviceName?: string | null
}

const STATUS_STYLES: Record<QuoteStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function QuoteCard({ quote, viewer, serviceName }: QuoteCardProps) {
  const [status, setStatus] = useState<QuoteStatus>(quote.status)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function act(action: 'accept' | 'decline') {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/${action}`, { method: 'PUT' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Could not ${action} quote.`)
      setStatus(data.quote.status)
      if (action === 'accept' && data.client_secret) {
        setClientSecret(data.client_secret)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} quote.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Quote{serviceName ? ` — ${serviceName}` : ''}
          </p>
          <p className="mt-1 text-2xl font-bold">{usd(quote.amount)}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
        <span className="inline-flex items-center gap-1">
          <Calendar size={14} />
          {new Date(`${quote.event_date}T00:00:00`).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        {quote.event_type && <span className="capitalize">{quote.event_type}</span>}
        {quote.guest_count != null && (
          <span className="inline-flex items-center gap-1">
            <Users size={14} />
            {quote.guest_count} guests
          </span>
        )}
      </div>

      {quote.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
          {quote.description}
        </p>
      )}

      {viewer === 'vendor' && (
        <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-800">
          Platform fee {usd(quote.platform_fee)} · Your payout{' '}
          <span className="font-semibold">{usd(quote.vendor_payout)}</span>
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {viewer === 'planner' && status === 'pending' && !clientSecret && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => act('accept')}
            disabled={busy}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Accept & Pay'}
          </button>
          <button
            onClick={() => act('decline')}
            disabled={busy}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Decline
          </button>
        </div>
      )}

      {viewer === 'planner' && status === 'accepted' && !clientSecret && (
        <button
          onClick={() => act('accept')}
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Loading payment…' : 'Continue to payment'}
        </button>
      )}

      {viewer === 'planner' && clientSecret && (
        <div className="mt-4">
          <QuotePayment clientSecret={clientSecret} amount={quote.amount} />
        </div>
      )}
    </div>
  )
}
