'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'
import type { Category } from '@/types'

interface VendorSearchFiltersProps {
  categories: Category[]
  // When set, the category is fixed (category pages) and the selector is hidden.
  lockedCategory?: string
  basePath?: string
}

const BUDGET_OPTIONS: { label: string; min?: number; max?: number }[] = [
  { label: 'Any budget' },
  { label: 'Under $500', max: 500 },
  { label: '$500–$1,000', min: 500, max: 1000 },
  { label: '$1,000–$2,500', min: 1000, max: 2500 },
  { label: '$2,500–$5,000', min: 2500, max: 5000 },
  { label: '$5,000+', min: 5000 },
]

function findBudgetIndex(min: string | null, max: string | null): number {
  const idx = BUDGET_OPTIONS.findIndex(
    (o) => String(o.min ?? '') === (min ?? '') && String(o.max ?? '') === (max ?? '')
  )
  return idx === -1 ? 0 : idx
}

export default function VendorSearchFilters({
  categories,
  lockedCategory,
  basePath = '/vendors',
}: VendorSearchFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState(lockedCategory ?? searchParams.get('category') ?? '')
  const [eventDate, setEventDate] = useState(searchParams.get('event_date') ?? '')
  const [budgetIndex, setBudgetIndex] = useState(
    findBudgetIndex(searchParams.get('budget_min'), searchParams.get('budget_max'))
  )

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (!lockedCategory && category) params.set('category', category)
    if (eventDate) params.set('event_date', eventDate)
    const budget = BUDGET_OPTIONS[budgetIndex]
    if (budget.min != null) params.set('budget_min', String(budget.min))
    if (budget.max != null) params.set('budget_max', String(budget.max))
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-xl border border-[#E5E2DA] bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="lg:col-span-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">Search</label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search vendors…"
          className="w-full rounded-lg border border-[#E5E2DA] px-3 py-2 text-sm outline-none transition focus:border-action focus:ring-2 focus:ring-action/30"
        />
      </div>
      {!lockedCategory && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-[#E5E2DA] px-3 py-2 text-sm outline-none transition focus:border-action focus:ring-2 focus:ring-action/30"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Event date</label>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="w-full rounded-lg border border-[#E5E2DA] px-3 py-2 text-sm outline-none transition focus:border-action focus:ring-2 focus:ring-action/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Budget</label>
        <select
          value={budgetIndex}
          onChange={(e) => setBudgetIndex(Number(e.target.value))}
          className="w-full rounded-lg border border-[#E5E2DA] px-3 py-2 text-sm outline-none transition focus:border-action focus:ring-2 focus:ring-action/30"
        >
          {BUDGET_OPTIONS.map((o, i) => (
            <option key={o.label} value={i}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end sm:col-span-2 lg:col-span-5">
        <button
          type="submit"
          className="rounded-lg bg-action px-6 py-2 font-outfit text-sm font-bold text-white transition hover:opacity-90"
        >
          Search
        </button>
      </div>
    </form>
  )
}
