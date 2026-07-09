import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { searchVendors } from '@/lib/vendors/search'
import VendorCard from '@/components/vendor/VendorCard'
import type { Category } from '@/types'
import {
  BUDGETS,
  OCCASIONS,
  SIZES,
  budgetByKey,
  effectiveCats,
} from '@/lib/plan/constants'
import PlanWizard from './PlanWizard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Plan My Event | Game Plan HTX',
  description:
    'Answer a few quick questions and get a curated shortlist of vetted Houston event vendors tailored to your occasion, budget, and guest count.',
}

interface PlanPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

const VENDORS_PER_GROUP = 3

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: categoryRows } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')
  const categories = (categoryRows ?? []) as Category[]

  // Wizard mode — until the planner finishes and requests results.
  if (!params.results) {
    return (
      <Suspense
        fallback={<div className="mx-auto max-w-3xl px-6 py-10 text-gray-500">Loading…</div>}
      >
        <PlanWizard categories={categories} />
      </Suspense>
    )
  }

  // ── Results mode — build the curated shortlist ──────────────────────────
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]))
  const selectedSlugs = effectiveCats(params.cats, params.occasion).filter((s) =>
    categoryBySlug.has(s)
  )
  const budget = budgetByKey(params.budget)

  // One ranked search per selected category, filtered by budget where provided.
  // Area is intentionally NOT applied as a filter: the vendors schema has no
  // service-area/neighborhood field (only city + zip_code), so filtering by
  // the chosen Houston area would exclude every vendor. It is captured for
  // shareability and shown in the summary instead.
  const groups = await Promise.all(
    selectedSlugs.map(async (slug) => {
      const result = await searchVendors(supabase, {
        category: slug,
        budget_min: budget?.min,
        budget_max: budget?.max,
        per_page: VENDORS_PER_GROUP,
      })
      return {
        category: categoryBySlug.get(slug)!,
        vendors: result.vendors,
        total: result.total,
      }
    })
  )

  const occasionLabel = OCCASIONS.find((o) => o.slug === params.occasion)?.label
  const sizeLabel = SIZES.find((s) => s.key === params.size)?.label
  const budgetLabel = BUDGETS.find((b) => b.key === params.budget)?.label
  const dateLabel =
    params.date === 'flexible'
      ? 'Flexible / TBD'
      : params.date
        ? new Date(`${params.date}T00:00:00`).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : undefined

  const summary = [occasionLabel, dateLabel, params.area, sizeLabel, budgetLabel].filter(
    Boolean
  ) as string[]

  function seeAllHref(slug: string): string {
    const p = new URLSearchParams({ category: slug })
    if (budget?.min != null) p.set('budget_min', String(budget.min))
    if (budget?.max != null) p.set('budget_max', String(budget.max))
    return `/vendors?${p.toString()}`
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold tracking-tight text-ink dark:text-white">
            Your Game Plan
          </h1>
          {summary.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-action/10 px-3 py-1 text-xs font-medium text-ink dark:text-gray-200"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link
          href="/plan"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Start over
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="mt-10 text-gray-600 dark:text-gray-400">
          No categories selected. <Link href="/plan" className="font-medium text-action">Go back</Link>{' '}
          and choose what you need.
        </p>
      ) : (
        <div className="mt-10 space-y-12">
          {groups.map(({ category, vendors, total }) => (
            <section key={category.id}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-outfit text-xl font-semibold text-ink dark:text-white">
                  {category.icon && <span className="mr-2">{category.icon}</span>}
                  {category.name}
                </h2>
                {total >= 2 && (
                  <Link
                    href={seeAllHref(category.slug)}
                    className="text-sm font-medium text-action hover:underline"
                  >
                    See all {category.name} vendors →
                  </Link>
                )}
              </div>
              {total < 2 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We&apos;re adding more {category.name} vendors soon.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {vendors.map((v) => (
                    <VendorCard key={v.id} vendor={v} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
