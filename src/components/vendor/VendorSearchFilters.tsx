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

const BUDGET_MAX = 20000

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
  const [budgetMax, setBudgetMax] = useState(
    Number(searchParams.get('budget_max')) || BUDGET_MAX
  )

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (!lockedCategory && category) params.set('category', category)
    if (eventDate) params.set('event_date', eventDate)
    if (budgetMax < BUDGET_MAX) params.set('budget_max', String(budgetMax))
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="lg:col-span-2">
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          Search
        </label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search vendors…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
      {!lockedCategory && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
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
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          Event date
        </label>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          Max budget:{' '}
          {budgetMax >= BUDGET_MAX ? 'Any' : `$${budgetMax.toLocaleString('en-US')}`}
        </label>
        <input
          type="range"
          min={100}
          max={BUDGET_MAX}
          step={100}
          value={budgetMax}
          onChange={(e) => setBudgetMax(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="flex items-end sm:col-span-2 lg:col-span-5">
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Search
        </button>
      </div>
    </form>
  )
}
