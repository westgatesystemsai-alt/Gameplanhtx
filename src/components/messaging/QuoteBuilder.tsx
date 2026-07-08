'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Service } from '@/types'
import { computeQuoteSplit, PLATFORM_FEE_PERCENT } from '@/lib/quotes/fees'

interface QuoteBuilderProps {
  conversationId: string
  services: Service[]
}

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function QuoteBuilder({ conversationId, services }: QuoteBuilderProps) {
  const router = useRouter()
  const [serviceId, setServiceId] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventType, setEventType] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedAmount = Number(amount)
  const split = useMemo(
    () =>
      Number.isFinite(parsedAmount) && parsedAmount > 0
        ? computeQuoteSplit(parsedAmount)
        : null,
    [parsedAmount]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!split || !eventDate) {
      setError('Event date and a valid price are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          service_id: serviceId || null,
          event_date: eventDate,
          event_type: eventType || null,
          guest_count: guestCount ? Number(guestCount) : null,
          description: description || null,
          amount: parsedAmount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not send quote.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send quote.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900'

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <h3 className="font-semibold">Send a quote</h3>

      <div>
        <label className="mb-1 block text-sm font-medium">Service</label>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className={inputClass}
        >
          <option value="">Custom / no listed service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Event date *</label>
          <input
            type="date"
            required
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Guest count</label>
          <input
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Event type</label>
        <input
          type="text"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          placeholder="Wedding, birthday, corporate…"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's included in this quote?"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Price (USD) *</label>
        <input
          type="number"
          min={1}
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
        />
      </div>

      {split && (
        <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Planner pays</span>
            <span>{usd(parsedAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Platform fee ({PLATFORM_FEE_PERCENT}%)</span>
            <span>−{usd(split.platform_fee)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold dark:border-gray-700">
            <span>You receive</span>
            <span>{usd(split.vendor_payout)}</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send quote'}
      </button>
    </form>
  )
}
