import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { searchVendors } from '@/lib/vendors/search'
import { OCCASION_CATEGORY_PRECHECK } from '@/lib/plan/constants'
import type { Category } from '@/types'
import BuildClient, { type BuildVendor } from './BuildClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Build Your Team | Game Plan HTX',
  description:
    'Draft your dream vendor lineup across every category for your Houston event, then send one inquiry to your whole team at once.',
}

const VENDORS_PER_COLUMN = 3

export default async function BuildPage() {
  const supabase = await createClient()

  // Every category that can appear as a column across all occasions.
  const columnSlugs = Array.from(
    new Set(Object.values(OCCASION_CATEGORY_PRECHECK).flat())
  )

  const { data: categoryRows } = await supabase
    .from('categories')
    .select('id, name, slug, icon, description, sort_order')
    .in('slug', columnSlugs)
  const categories = (categoryRows ?? []) as Category[]

  const categoriesBySlug: Record<string, Pick<Category, 'id' | 'name' | 'slug' | 'icon'>> = {}
  for (const c of categories) {
    categoriesBySlug[c.slug] = { id: c.id, name: c.name, slug: c.slug, icon: c.icon }
  }

  // Pre-rank the top vendors for each column up front (reusing the shared
  // search/ranking logic). The occasion is chosen client-side, so we fetch the
  // union and let the client show the relevant subset without a round trip.
  const vendorLists = await Promise.all(
    columnSlugs.map(async (slug) => {
      if (!categoriesBySlug[slug]) return [slug, [] as BuildVendor[]] as const
      const result = await searchVendors(supabase, {
        category: slug,
        per_page: VENDORS_PER_COLUMN,
      })
      return [slug, result.vendors as BuildVendor[]] as const
    })
  )

  const vendorsBySlug: Record<string, BuildVendor[]> = {}
  for (const [slug, vendors] of vendorLists) {
    vendorsBySlug[slug] = vendors
  }

  return <BuildClient categoriesBySlug={categoriesBySlug} vendorsBySlug={vendorsBySlug} />
}
