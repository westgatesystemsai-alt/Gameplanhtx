import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, PortfolioMedia, Service, Vendor } from '@/types'

export interface VendorSearchParams {
  category?: string // category slug
  event_date?: string // YYYY-MM-DD
  budget_min?: number
  budget_max?: number
  guests?: number
  zip?: string
  page?: number
  per_page?: number
}

export interface RankedVendor extends Vendor {
  services: Service[]
  categories: Category[]
  cover_photo: string | null
  score: number
}

export interface VendorSearchResult {
  vendors: RankedVendor[]
  featured: RankedVendor[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

// Section 9 ranking score. Each factor is normalized to 0-1 before weighting
// so no single raw scale (0-5 rating vs 0-100 percentages) dominates.
export function rankingScore(vendor: {
  avg_rating: number
  profile_completeness: number
  response_rate: number
  recentActivity: boolean
}): number {
  return (
    (vendor.avg_rating / 5) * 0.35 +
    (vendor.profile_completeness / 100) * 0.25 +
    (vendor.response_rate / 100) * 0.25 +
    (vendor.recentActivity ? 1 : 0) * 0.15
  )
}

export async function searchVendors(
  supabase: SupabaseClient,
  params: VendorSearchParams
): Promise<VendorSearchResult> {
  const page = Math.max(1, params.page ?? 1)
  const perPage = Math.min(50, Math.max(1, params.per_page ?? 12))

  // 1. Category filter (exact match on slug via vendor_categories)
  let categoryVendorIds: string[] | null = null
  if (params.category) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', params.category)
      .maybeSingle()
    if (!category) {
      return { vendors: [], featured: [], total: 0, page, per_page: perPage, total_pages: 0 }
    }
    const { data: links } = await supabase
      .from('vendor_categories')
      .select('vendor_id')
      .eq('category_id', category.id)
    categoryVendorIds = (links ?? []).map((l) => l.vendor_id)
    if (categoryVendorIds.length === 0) {
      return { vendors: [], featured: [], total: 0, page, per_page: perPage, total_pages: 0 }
    }
  }

  // 2. Status filter — approved only
  let query = supabase
    .from('vendors')
    .select(
      '*, services(*), vendor_categories(categories(*)), portfolio_media(url, thumbnail_url, sort_order)'
    )
    .eq('status', 'approved')
  if (categoryVendorIds) query = query.in('id', categoryVendorIds)
  if (params.zip) query = query.eq('zip_code', params.zip)

  const { data: rows, error } = await query
  if (error) throw error

  let vendors = (rows ?? []) as (Vendor & {
    services: Service[]
    vendor_categories: { categories: Category }[]
    portfolio_media: Pick<PortfolioMedia, 'url' | 'thumbnail_url' | 'sort_order'>[]
  })[]

  // 3. Event date availability — exclude vendors marked unavailable that day
  if (params.event_date) {
    const { data: blocked } = await supabase
      .from('availability')
      .select('vendor_id')
      .eq('date', params.event_date)
      .eq('is_available', false)
    const blockedIds = new Set((blocked ?? []).map((b) => b.vendor_id))
    vendors = vendors.filter((v) => !blockedIds.has(v.id))
  }

  // 4. Budget — keep vendors with at least one active service in range;
  //    price_type = 'contact' is always included
  const hasBudget = params.budget_min != null || params.budget_max != null
  if (hasBudget) {
    const min = params.budget_min ?? 0
    const max = params.budget_max ?? Number.POSITIVE_INFINITY
    vendors = vendors.filter((v) =>
      v.services.some(
        (s) =>
          s.is_active &&
          (s.price_type === 'contact' ||
            (s.price_amount != null && s.price_amount >= min && s.price_amount <= max))
      )
    )
  }

  // 5. Guest count — planner's count within min_guests / max_guests
  if (params.guests != null) {
    const guests = params.guests
    vendors = vendors.filter((v) =>
      v.services.some(
        (s) =>
          s.is_active &&
          (s.min_guests == null || guests >= s.min_guests) &&
          (s.max_guests == null || guests <= s.max_guests)
      )
    )
  }

  // Recency: reviews or vendor activity in the last 90 days
  const since = new Date(Date.now() - NINETY_DAYS_MS).toISOString()
  const recentIds = new Set<string>()
  if (vendors.length > 0) {
    const { data: recentReviews } = await supabase
      .from('reviews')
      .select('vendor_id')
      .gte('created_at', since)
      .in('vendor_id', vendors.map((v) => v.id))
    for (const r of recentReviews ?? []) recentIds.add(r.vendor_id)
    for (const v of vendors) {
      if (v.updated_at >= since) recentIds.add(v.id)
    }
  }

  const ranked: RankedVendor[] = vendors
    .map((v) => {
      const media = [...(v.portfolio_media ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      )
      return {
        ...v,
        services: v.services ?? [],
        categories: (v.vendor_categories ?? []).map((vc) => vc.categories).filter(Boolean),
        cover_photo: media[0]?.thumbnail_url ?? media[0]?.url ?? null,
        score: rankingScore({ ...v, recentActivity: recentIds.has(v.id) }),
      }
    })
    .sort((a, b) => b.score - a.score)

  // Featured: Pro/Premium pool, max 4, randomly rotated per request.
  // Ranked list below remains score-sorted for all tiers.
  const eligible = ranked.filter((v) => v.tier === 'pro' || v.tier === 'premium')
  const featured = [...eligible].sort(() => Math.random() - 0.5).slice(0, 4)

  const total = ranked.length
  const start = (page - 1) * perPage
  return {
    vendors: ranked.slice(start, start + perPage),
    featured: page === 1 ? featured : [],
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  }
}

// Canonical profile URL slug: [category-slug]-houston-[business-slug]
export function vendorProfileSlug(vendor: Vendor, categories: Category[]): string {
  const categorySlug = categories[0]?.slug ?? 'vendor'
  return `${categorySlug}-houston-${vendor.slug}`
}

// Extract the business slug from a profile URL slug.
export function parseVendorSlug(profileSlug: string): string {
  const marker = '-houston-'
  const idx = profileSlug.lastIndexOf(marker)
  return idx === -1 ? profileSlug : profileSlug.slice(idx + marker.length)
}
