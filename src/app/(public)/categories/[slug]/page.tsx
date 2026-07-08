import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { searchVendors } from '@/lib/vendors/search'
import VendorCard from '@/components/vendor/VendorCard'
import VendorSearchFilters from '@/components/vendor/VendorSearchFilters'
import type { Category } from '@/types'

export const dynamic = 'force-dynamic'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: category } = await supabase
    .from('categories')
    .select('name, description')
    .eq('slug', slug)
    .maybeSingle()
  if (!category) return { title: 'Category Not Found | Game Plan HTX' }
  return {
    title: `${category.name} in Houston | Game Plan HTX`,
    description:
      category.description ?? `Find vetted ${category.name} vendors for your Houston event.`,
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (!category) notFound()

  const result = await searchVendors(supabase, {
    category: slug,
    event_date: sp.event_date,
    budget_min: sp.budget_min ? Number(sp.budget_min) : undefined,
    budget_max: sp.budget_max ? Number(sp.budget_max) : undefined,
    guests: sp.guests ? Number(sp.guests) : undefined,
    zip: sp.zip,
    page: sp.page ? Number(sp.page) : 1,
  })

  const q = sp.q?.toLowerCase()
  const vendors = q
    ? result.vendors.filter((v) => v.business_name.toLowerCase().includes(q))
    : result.vendors

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        {category.name} in Houston
      </h1>
      {category.description && (
        <p className="mb-6 text-gray-600 dark:text-gray-400">{category.description}</p>
      )}
      <Suspense>
        <VendorSearchFilters
          categories={[category as Category]}
          lockedCategory={slug}
          basePath={`/categories/${slug}`}
        />
      </Suspense>

      {result.featured.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Featured Vendors</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {result.featured.map((v) => (
              <VendorCard key={v.id} vendor={v} featured />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">
          {result.total} vendor{result.total === 1 ? '' : 's'} found
        </h2>
        {vendors.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            No approved vendors in this category yet. Check back soon.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
