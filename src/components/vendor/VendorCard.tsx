import Link from 'next/link'
import { Star } from 'lucide-react'
import type { Category, Service, Vendor } from '@/types'
import { vendorProfileSlug } from '@/lib/vendors/search'

interface VendorCardProps {
  vendor: Vendor & {
    services?: Service[]
    categories?: Category[]
    cover_photo?: string | null
  }
  featured?: boolean
}

function priceRange(services: Service[] = []): string {
  const prices = services
    .filter((s) => s.is_active && s.price_amount != null && s.price_type !== 'contact')
    .map((s) => s.price_amount as number)
  if (prices.length === 0) return 'Contact for pricing'
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={
            i <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
          }
        />
      ))}
    </span>
  )
}

export default function VendorCard({ vendor, featured = false }: VendorCardProps) {
  const category = vendor.categories?.[0]
  const href = `/vendors/${vendorProfileSlug(vendor, vendor.categories ?? [])}`

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        {vendor.cover_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.cover_photo}
            alt={vendor.business_name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-gray-300 dark:text-gray-600">
            {vendor.business_name.charAt(0)}
          </div>
        )}
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">
            Featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{vendor.business_name}</h3>
          {category && (
            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {category.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <Stars rating={vendor.avg_rating} />
          <span>
            {vendor.avg_rating > 0 ? vendor.avg_rating.toFixed(1) : 'New'}
            {vendor.review_count > 0 && ` (${vendor.review_count})`}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{priceRange(vendor.services)}</p>
        <Link
          href={href}
          className="mt-auto inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          View Profile
        </Link>
      </div>
    </div>
  )
}
