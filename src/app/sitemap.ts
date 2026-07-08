import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { vendorProfileSlug } from '@/lib/vendors/search'
import type { Category, Vendor } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gameplanhtx.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const [{ data: vendors }, { data: categories }] = await Promise.all([
    supabase
      .from('vendors')
      .select('*, vendor_categories(categories(*))')
      .eq('status', 'approved'),
    supabase.from('categories').select('slug'),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/vendors`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/categories`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${BASE_URL}/categories/${c.slug}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const vendorPages: MetadataRoute.Sitemap = (
    (vendors ?? []) as (Vendor & { vendor_categories: { categories: Category }[] })[]
  ).map((v) => ({
    url: `${BASE_URL}/vendors/${vendorProfileSlug(
      v,
      (v.vendor_categories ?? []).map((vc) => vc.categories).filter(Boolean)
    )}`,
    lastModified: v.updated_at,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...categoryPages, ...vendorPages]
}
