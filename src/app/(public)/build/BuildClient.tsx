'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import VendorCard from '@/components/vendor/VendorCard'
import type { Category, Service, Vendor } from '@/types'
import { BUDGETS, OCCASIONS, OCCASION_CATEGORY_PRECHECK } from '@/lib/plan/constants'

// A vendor as shipped from the server ranking pipeline — enough for VendorCard.
export type BuildVendor = Vendor & {
  services?: Service[]
  categories?: Category[]
  cover_photo?: string | null
}

interface BuildClientProps {
  // Category display metadata keyed by slug (name/icon), for every category
  // that can appear as a column across all occasions.
  categoriesBySlug: Record<string, Pick<Category, 'id' | 'name' | 'slug' | 'icon'>>
  // Up to 3 ranked vendors per category slug.
  vendorsBySlug: Record<string, BuildVendor[]>
}

export default function BuildClient({ categoriesBySlug, vendorsBySlug }: BuildClientProps) {
  const router = useRouter()

  const [occasion, setOccasion] = useState<string | null>(null)
  // Selected vendor per category column: { [categorySlug]: vendorId }.
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [modalOpen, setModalOpen] = useState(false)

  // Columns for the current occasion, in the order defined by the mapping,
  // limited to categories we actually have metadata for.
  const columns = useMemo(() => {
    if (!occasion) return []
    return (OCCASION_CATEGORY_PRECHECK[occasion] ?? []).filter((slug) => categoriesBySlug[slug])
  }, [occasion, categoriesBySlug])

  function pickOccasion(slug: string) {
    setOccasion(slug)
    setSelected({}) // Columns change with the occasion, so reset the team.
  }

  function toggleVendor(categorySlug: string, vendorId: string) {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[categorySlug] === vendorId) delete next[categorySlug]
      else next[categorySlug] = vendorId
      return next
    })
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 pb-40 lg:pb-10">
      <header className="max-w-2xl">
        <h1 className="font-outfit text-3xl font-bold tracking-tight text-ink dark:text-white">
          Build Your Team
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Pick your event type, then draft your dream lineup — one vendor per position.
          Send them all a single inquiry when your roster&apos;s set.
        </p>
      </header>

      {/* Step 1 — Event type selector */}
      <section className="mt-8">
        <h2 className="font-outfit text-sm font-semibold text-ink dark:text-gray-200">
          What&apos;s the occasion?
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {OCCASIONS.map((o) => {
            const active = occasion === o.slug
            return (
              <button
                key={o.slug}
                type="button"
                onClick={() => pickOccasion(o.slug)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition ${
                  active
                    ? 'border-action bg-action/10 text-ink dark:text-white'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-2xl">{o.emoji}</span>
                <span className="font-outfit text-xs font-semibold">{o.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Step 2/3 — Depth-chart columns */}
      {occasion && (
        <section className="mt-10 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-8">
          <div>
            {columns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center dark:border-gray-700 dark:bg-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We&apos;re still building the recommended lineup for this event type.
                  Try another occasion, or{' '}
                  <Link href="/vendors" className="font-medium text-action hover:underline">
                    browse all vendors
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:overflow-visible lg:px-0 xl:grid-cols-3">
                {columns.map((slug) => (
                  <DepthColumn
                    key={slug}
                    category={categoriesBySlug[slug]}
                    vendors={vendorsBySlug[slug] ?? []}
                    selectedId={selected[slug] ?? null}
                    onToggle={(vendorId) => toggleVendor(slug, vendorId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Step 4 — My Team panel (desktop sidebar) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <MyTeamPanel
                columns={columns}
                categoriesBySlug={categoriesBySlug}
                vendorsBySlug={vendorsBySlug}
                selected={selected}
                onSend={() => setModalOpen(true)}
              />
            </div>
          </div>
        </section>
      )}

      {/* Step 4 — My Team panel (mobile sticky footer) */}
      {occasion && columns.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-4 backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-950/95">
          <MyTeamPanel
            columns={columns}
            categoriesBySlug={categoriesBySlug}
            vendorsBySlug={vendorsBySlug}
            selected={selected}
            onSend={() => setModalOpen(true)}
            compact
          />
        </div>
      )}

      {/* Step 5 — Batch inquiry modal */}
      {modalOpen && (
        <InquiryModal
          occasion={occasion}
          columns={columns}
          categoriesBySlug={categoriesBySlug}
          vendorsBySlug={vendorsBySlug}
          selected={selected}
          onClose={() => setModalOpen(false)}
          onSent={() => router.push('/dashboard/messages')}
        />
      )}
    </main>
  )
}

function DepthColumn({
  category,
  vendors,
  selectedId,
  onToggle,
}: {
  category: Pick<Category, 'id' | 'name' | 'slug' | 'icon'>
  vendors: BuildVendor[]
  selectedId: string | null
  onToggle: (vendorId: string) => void
}) {
  const cards = vendors.slice(0, 3)
  const hasEnough = cards.length >= 2

  return (
    <div className="w-[82%] shrink-0 snap-start sm:w-72 lg:w-auto">
      <h3 className="mb-3 flex items-center gap-1.5 font-outfit text-base font-bold text-ink">
        {category.icon && <span>{category.icon}</span>}
        {category.name}
      </h3>
      <div className="flex flex-col gap-4">
        {hasEnough ? (
          cards.map((v) => (
            <SelectableCard
              key={v.id}
              vendor={v}
              selected={selectedId === v.id}
              onSelect={() => onToggle(v.id)}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We&apos;re adding more {category.name} vendors soon.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function SelectableCard({
  vendor,
  selected,
  onSelect,
}: {
  vendor: BuildVendor
  selected: boolean
  onSelect: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className="relative cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
    >
      <VendorCard vendor={vendor} />
      {selected && (
        <>
          {/* Light orange fill + orange border overlay (#FF4D1F) */}
          <div
            className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-inset ring-[#FF4D1F]"
            style={{ backgroundColor: 'rgba(255, 77, 31, 0.08)' }}
          />
          <span className="pointer-events-none absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#FF4D1F] text-white shadow">
            <Check size={16} strokeWidth={3} />
          </span>
        </>
      )}
    </div>
  )
}

function MyTeamPanel({
  columns,
  categoriesBySlug,
  vendorsBySlug,
  selected,
  onSend,
  compact = false,
}: {
  columns: string[]
  categoriesBySlug: Record<string, Pick<Category, 'id' | 'name' | 'slug' | 'icon'>>
  vendorsBySlug: Record<string, BuildVendor[]>
  selected: Record<string, string>
  onSend: () => void
  compact?: boolean
}) {
  const count = Object.keys(selected).length
  const total = columns.length

  function vendorName(slug: string): string | null {
    const id = selected[slug]
    if (!id) return null
    return vendorsBySlug[slug]?.find((v) => v.id === id)?.business_name ?? null
  }

  return (
    <div className={compact ? '' : 'rounded-2xl bg-ink p-5 text-white shadow-sm'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className={`font-outfit text-base font-bold ${compact ? 'text-ink' : 'text-white'}`}>
            My Team
          </h2>
          <p className={`text-xs font-medium ${compact ? 'text-gray-500' : 'text-gray-400'}`}>
            {count} of {total} vendors selected
          </p>
        </div>
        {compact && (
          <button
            type="button"
            onClick={onSend}
            disabled={count === 0}
            className="shrink-0 rounded-lg bg-action px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send Inquiry{count > 0 ? ` (${count})` : ''}
          </button>
        )}
      </div>

      {!compact && (
        <>
          <ul className="mt-4 space-y-2">
            {columns.map((slug) => {
              const name = vendorName(slug)
              const cat = categoriesBySlug[slug]
              return (
                <li
                  key={slug}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  <span className="text-gray-400">{cat?.name}</span>
                  {name ? (
                    <span className="truncate text-right font-medium text-white">{name}</span>
                  ) : (
                    <span className="text-right text-xs text-gray-500">Not selected</span>
                  )}
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={onSend}
            disabled={count === 0}
            className="mt-5 w-full rounded-lg bg-action px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send Inquiry to My Team
          </button>
        </>
      )}
    </div>
  )
}

function InquiryModal({
  occasion,
  columns,
  categoriesBySlug,
  vendorsBySlug,
  selected,
  onClose,
  onSent,
}: {
  occasion: string | null
  columns: string[]
  categoriesBySlug: Record<string, Pick<Category, 'id' | 'name' | 'slug' | 'icon'>>
  vendorsBySlug: Record<string, BuildVendor[]>
  selected: Record<string, string>
  onClose: () => void
  onSent: () => void
}) {
  const [eventDate, setEventDate] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [budget, setBudget] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const occasionLabel = OCCASIONS.find((o) => o.slug === occasion)?.label ?? 'Event'
  const targets = columns
    .filter((slug) => selected[slug])
    .map((slug) => ({
      categoryName: categoriesBySlug[slug]?.name ?? slug,
      vendorId: selected[slug],
      vendorName:
        vendorsBySlug[slug]?.find((v) => v.id === selected[slug])?.business_name ?? 'Vendor',
    }))

  function buildMessage(categoryName: string): string {
    const lines = [
      `Hi! I'm putting together my team for a ${occasionLabel.toLowerCase()} and would love to work with you for ${categoryName.toLowerCase()}.`,
      '',
      `Event type: ${occasionLabel}`,
    ]
    if (eventDate) lines.push(`Event date: ${eventDate}`)
    if (guestCount) lines.push(`Guest count: ${guestCount}`)
    if (budget) lines.push(`Budget: ${budget}`)
    if (notes.trim()) {
      lines.push('', 'Details:', notes.trim())
    }
    lines.push('', 'Looking forward to hearing from you!')
    return lines.join('\n')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Fan the same brief out to each selected vendor as its own thread,
      // reusing the single-vendor inquiry endpoint.
      const responses = await Promise.all(
        targets.map((t) =>
          fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vendor_id: t.vendorId,
              message: buildMessage(t.categoryName),
            }),
          })
        )
      )

      if (responses.some((r) => r.status === 401)) {
        window.location.assign('/login?redirect=/build')
        return
      }
      if (responses.some((r) => !r.ok)) {
        throw new Error('Some inquiries could not be sent. Please try again.')
      }

      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-outfit text-xl font-bold text-ink dark:text-white">
              Send Inquiry to My Team
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {targets.length} vendor{targets.length === 1 ? '' : 's'} will each receive your
              brief as a separate conversation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {targets.map((t) => (
            <li
              key={t.vendorId}
              className="rounded-full bg-action/10 px-2.5 py-1 text-xs font-medium text-ink dark:text-gray-200"
            >
              {t.vendorName}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-outfit text-sm font-semibold text-ink dark:text-gray-200">
                Event date
              </span>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-outfit text-sm font-semibold text-ink dark:text-gray-200">
                Guest count
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="e.g. 120"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block font-outfit text-sm font-semibold text-ink dark:text-gray-200">
              Budget
            </span>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">No preference</option>
              {BUDGETS.map((b) => (
                <option key={b.key} value={b.label}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block font-outfit text-sm font-semibold text-ink dark:text-gray-200">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Tell your team about your vision, must-haves, or anything else…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || targets.length === 0}
              className="rounded-lg bg-action px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Sending…' : `Send to ${targets.length} vendor${targets.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
