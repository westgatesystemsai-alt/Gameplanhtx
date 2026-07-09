import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { searchVendors } from '@/lib/vendors/search'
import VendorCard from '@/components/vendor/VendorCard'
import VendorSearchFilters from '@/components/vendor/VendorSearchFilters'
import type { Category } from '@/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Find Houston Event Vendors | Game Plan HTX',
  description:
    'Search vetted Houston event vendors by category, date, budget, and guest count.',
}

interface SearchPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function VendorSearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')

  const result = await searchVendors(supabase, {
    category: params.category,
    event_date: params.event_date,
    budget_min: params.budget_min ? Number(params.budget_min) : undefined,
    budget_max: params.budget_max ? Number(params.budget_max) : undefined,
    guests: params.guests ? Number(params.guests) : undefined,
    zip: params.zip,
    page: params.page ? Number(params.page) : 1,
  })

  const q = params.q?.toLowerCase()
  const vendors = q
    ? result.vendors.filter((v) => v.business_name.toLowerCase().includes(q))
    : result.vendors
  const featured = q
    ? result.featured.filter((v) => v.business_name.toLowerCase().includes(q))
    : result.featured

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 font-outfit text-3xl font-bold tracking-tight text-ink">
        Find Houston Event Vendors
      </h1>
      <Suspense>
        <VendorSearchFilters categories={(categories ?? []) as Category[]} />
      </Suspense>

      {featured.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 font-outfit text-lg font-bold text-ink">Featured Vendors</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((v) => (
              <VendorCard key={v.id} vendor={v} featured />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 font-outfit text-lg font-bold text-ink">
          {result.total} vendor{result.total === 1 ? '' : 's'} found
        </h2>
        {vendors.length === 0 ? (
          <p className="text-gray-600">
            No vendors match your search. Try adjusting your filters.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        )}
      </section>

      {result.total_pages > 1 && (
        <nav className="mt-10 flex justify-center gap-2">
          {Array.from({ length: result.total_pages }, (_, i) => i + 1).map((p) => {
            const pageParams = new URLSearchParams(
              Object.entries(params).filter(([, v]) => v != null) as [string, string][]
            )
            pageParams.set('page', String(p))
            return (
              <a
                key={p}
                href={`/vendors?${pageParams.toString()}`}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  p === result.page
                    ? 'border-action bg-action text-white'
                    : 'border-[#E5E2DA] bg-white hover:border-action hover:text-action'
                }`}
              >
                {p}
              </a>
            )
          })}
        </nav>
      )}
    </main>
  )
}
