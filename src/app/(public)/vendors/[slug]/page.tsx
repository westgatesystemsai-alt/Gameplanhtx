import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { parseVendorSlug, vendorProfileSlug } from '@/lib/vendors/search'
import type { Category, PortfolioMedia, Review, Service, Vendor } from '@/types'

export const dynamic = 'force-dynamic'

interface ProfilePageProps {
  params: Promise<{ slug: string }>
}

type VendorProfile = Vendor & {
  services: Service[]
  portfolio_media: PortfolioMedia[]
  vendor_categories: { categories: Category }[]
}

async function getVendor(profileSlug: string) {
  const supabase = await createClient()
  const businessSlug = parseVendorSlug(profileSlug)
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*, services(*), portfolio_media(*), vendor_categories(categories(*))')
    .eq('slug', businessSlug)
    .eq('status', 'approved')
    .maybeSingle()
  if (!vendor) return null

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, body, created_at')
    .eq('vendor_id', vendor.id)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(10)

  return { vendor: vendor as VendorProfile, reviews: (reviews ?? []) as Review[] }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getVendor(slug)
  if (!data) return { title: 'Vendor Not Found | Game Plan HTX' }
  const { vendor } = data
  return {
    title: `${vendor.business_name} — Houston Event Vendor | Game Plan HTX`,
    description: vendor.bio ?? `Book ${vendor.business_name} for your Houston event.`,
  }
}

function priceLabel(s: Service): string {
  if (s.price_type === 'contact' || s.price_amount == null) return 'Contact for pricing'
  const amount = `$${s.price_amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  switch (s.price_type) {
    case 'hourly':
      return `${amount}/hr`
    case 'per_person':
      return `${amount}/person`
    default:
      return amount
  }
}

export default async function VendorProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params
  const data = await getVendor(slug)
  if (!data) notFound()

  const { vendor, reviews } = data
  const categories = (vendor.vendor_categories ?? []).map((vc) => vc.categories).filter(Boolean)
  const canonicalSlug = vendorProfileSlug(vendor, categories)
  const media = [...(vendor.portfolio_media ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )
  const hero = media[0]
  const activeServices = vendor.services.filter((s) => s.is_active)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: vendor.business_name,
    description: vendor.bio,
    url: `https://gameplanhtx.com/vendors/${canonicalSlug}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Houston',
      addressRegion: 'TX',
    },
    ...(vendor.review_count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: vendor.avg_rating,
        reviewCount: vendor.review_count,
      },
    }),
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <div className="relative aspect-[21/9] overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero.url}
            alt={hero.caption ?? vendor.business_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl font-bold text-gray-300 dark:text-gray-600">
            {vendor.business_name.charAt(0)}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{vendor.business_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
              >
                {c.name}
              </Link>
            ))}
            <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              {vendor.avg_rating > 0 ? vendor.avg_rating.toFixed(1) : 'New'}
              {vendor.review_count > 0 && ` (${vendor.review_count} reviews)`}
            </span>
          </div>
        </div>
        <Link
          href={`/messages/new?vendor=${vendor.id}`}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Send Inquiry
        </Link>
      </div>

      {/* Bio */}
      {vendor.bio && (
        <section className="mt-8">
          <h2 className="mb-2 text-xl font-semibold">About</h2>
          <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">{vendor.bio}</p>
        </section>
      )}

      {/* Services */}
      {activeServices.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Services</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {activeServices.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{s.title}</h3>
                  <span className="shrink-0 text-sm font-semibold">{priceLabel(s)}</span>
                </div>
                {s.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{s.description}</p>
                )}
                {(s.min_guests != null || s.max_guests != null) && (
                  <p className="mt-1 text-xs text-gray-500">
                    Guests: {s.min_guests ?? 'Any'} – {s.max_guests ?? 'Any'}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Portfolio */}
      {media.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Portfolio</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {media.map((m) => (
              <div
                key={m.id}
                className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.thumbnail_url ?? m.url}
                  alt={m.caption ?? `${vendor.business_name} portfolio`}
                  className="h-full w-full object-cover transition hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No reviews yet.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i <= r.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
                        }
                      />
                    ))}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
                {r.body && (
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{r.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
