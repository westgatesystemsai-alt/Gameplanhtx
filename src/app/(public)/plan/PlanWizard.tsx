'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { Category } from '@/types'
import {
  AREAS,
  BUDGETS,
  OCCASIONS,
  SIZES,
  TOTAL_STEPS,
  effectiveCats,
} from '@/lib/plan/constants'

interface PlanWizardProps {
  categories: Category[]
}

const STEP_TITLES = [
  "What's the occasion?",
  'When & where?',
  'How big?',
  'What do you need?',
  "What's your budget?",
]

// Shared tile/chip styling. Selected items get an orange border + light orange
// fill per the design tokens; unselected are neutral.
function selectableClasses(selected: boolean): string {
  return selected
    ? 'border-action bg-action/[0.06] text-ink'
    : 'border-[#E5E2DA] bg-white hover:border-gray-300'
}

export default function PlanWizard({ categories }: PlanWizardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const step = Math.min(TOTAL_STEPS, Math.max(1, Number(searchParams.get('step')) || 1))
  const occasion = searchParams.get('occasion')
  const dateParam = searchParams.get('date')
  const flexibleDate = dateParam === 'flexible'
  const dateValue = flexibleDate ? '' : (dateParam ?? '')
  const area = searchParams.get('area')
  const size = searchParams.get('size')
  const catsParam = searchParams.get('cats')
  const budget = searchParams.get('budget')

  const selectedCats = effectiveCats(catsParam, occasion)

  const buildUrl = useCallback(
    (mods: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(mods)) {
        if (v === null) p.delete(k)
        else p.set(k, v)
      }
      return `/plan?${p.toString()}`
    },
    [searchParams]
  )

  // Selections update the current history entry (shareable, no history spam).
  const select = useCallback(
    (mods: Record<string, string | null>) => {
      router.replace(buildUrl(mods), { scroll: false })
    },
    [router, buildUrl]
  )

  // Step navigation pushes a new history entry so the browser back button
  // returns to the previous step.
  const goToStep = useCallback(
    (next: number) => {
      router.push(buildUrl({ step: String(next) }), { scroll: false })
    },
    [router, buildUrl]
  )

  function toggleCategory(slug: string) {
    const set = new Set(selectedCats)
    if (set.has(slug)) set.delete(slug)
    else set.add(slug)
    // Write the full resulting selection (empty string = deliberately cleared).
    select({ cats: Array.from(set).join(',') })
  }

  const canAdvance = step === 1 ? Boolean(occasion) : true
  const canFinish = selectedCats.length > 0

  function finish() {
    router.push(buildUrl({ results: '1' }), { scroll: false })
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-outfit text-sm font-semibold text-ink dark:text-gray-200">
            {STEP_TITLES[step - 1]}
          </p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                n <= step ? 'bg-action' : 'bg-[#E5E2DA]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1 — Occasion */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {OCCASIONS.map((o) => (
            <button
              key={o.slug}
              type="button"
              onClick={() => select({ occasion: o.slug })}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-6 text-center transition ${selectableClasses(
                occasion === o.slug
              )}`}
            >
              <span className="text-3xl">{o.emoji}</span>
              <span className="font-outfit text-sm font-semibold">{o.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — When & where */}
      {step === 2 && (
        <div className="grid gap-6">
          <div>
            <label className="mb-2 block font-outfit text-sm font-semibold text-ink dark:text-gray-200">
              Event date
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={dateValue}
                disabled={flexibleDate}
                onChange={(e) =>
                  select({ date: e.target.value ? e.target.value : null })
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
              />
              <button
                type="button"
                onClick={() => select({ date: flexibleDate ? null : 'flexible' })}
                className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition ${selectableClasses(
                  flexibleDate
                )}`}
              >
                Flexible / TBD
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 block font-outfit text-sm font-semibold text-ink dark:text-gray-200">
              Houston area
            </label>
            <select
              value={area ?? ''}
              onChange={(e) => select({ area: e.target.value ? e.target.value : null })}
              className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">Select an area…</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Step 3 — Size */}
      {step === 3 && (
        <div className="flex flex-wrap gap-3">
          {SIZES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => select({ size: s.key })}
              className={`rounded-full border-2 px-5 py-2.5 text-sm font-medium transition ${selectableClasses(
                size === s.key
              )}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Step 4 — Categories */}
      {step === 4 && (
        <div className="flex flex-wrap gap-2.5">
          {categories.map((c) => {
            const selected = selectedCats.includes(c.slug)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.slug)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition ${selectableClasses(
                  selected
                )}`}
              >
                {c.icon && <span className="mr-1.5">{c.icon}</span>}
                {c.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Step 5 — Budget */}
      {step === 5 && (
        <div>
          <div className="flex flex-wrap gap-3">
            {BUDGETS.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => select({ budget: budget === b.key ? null : b.key })}
                className={`rounded-full border-2 px-5 py-2.5 text-sm font-medium transition ${selectableClasses(
                  budget === b.key
                )}`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            This helps us show vendors in your range. Optional — you can skip it.
          </p>
          {!canFinish && (
            <p className="mt-4 text-sm font-medium text-action">
              Pick at least one category in step 4 to build your shortlist.
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToStep(step - 1)}
          disabled={step === 1}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Back
        </button>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => goToStep(step + 1)}
            disabled={!canAdvance}
            className="rounded-lg bg-action px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            disabled={!canFinish}
            className="rounded-lg bg-action px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            See My Game Plan
          </button>
        )}
      </div>
    </div>
  )
}
