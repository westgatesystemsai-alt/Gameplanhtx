import Link from 'next/link'
import { Star } from 'lucide-react'
import type { Category, Service, Vendor } from '@/types'
import { vendorProfileSlug } from '@/lib/vendors/search'
import { isVendorVerified } from '@/lib/vendors/verified'
import VerifiedBadge from '@/components/vendor/VerifiedBadge'
import ResponseTimeBadge from '@/components/vendor/ResponseTimeBadge'

interface VendorCardProps {
  vendor: Vendor & {
    services?: Service[]
    categories?: Category[]
    cover_photo?: string | null
  }
  featured?: boolean
}

function fromPrice(min: number | null | undefined): string | null {
  if (min == null) return null
  return `From $${min.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
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
          className={i <= Math.round(rating) ? 'fill-gold text-gold' : 'fill-gray-200 text-gray-200'}
        />
      ))}
    </span>
  )
}

export default function VendorCard({ vendor, featured = false }: VendorCardProps) {
  const category = vendor.categories?.[0]
  const href = `/vendors/${vendorProfileSlug(vendor, vendor.categories ?? [])}`
  const verified = isVendorVerified(vendor.verified_items)
  const startingPrice = fromPrice(vendor.price_range_min)

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-[#E5E2DA] border-l-[3px] border-l-transparent bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-l-action hover:shadow-lg">
      <div className="relative aspect-[4/3] bg-gray-100">
        {vendor.cover_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.cover_photo}
            alt={vendor.business_name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-gray-300">
            {vendor.business_name.charAt(0)}
          </div>
        )}
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-0.5 text-xs font-semibold text-ink">
            Featured
          </span>
        )}
        {verified && <VerifiedBadge className="absolute right-3 top-3" />}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {category && (
          <span className="font-outfit text-[9px] font-bold uppercase tracking-[0.12em] text-action">
            {category.name}
          </span>
        )}
        <h3 className="font-outfit text-base font-extrabold leading-snug text-ink">
          {vendor.business_name}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-600">
          <Stars rating={vendor.avg_rating} />
          <span>
            {vendor.avg_rating > 0 ? vendor.avg_rating.toFixed(1) : 'New'}
            {vendor.review_count > 0 && ` (${vendor.review_count})`}
          </span>
          <ResponseTimeBadge responseRate={vendor.response_rate} />
        </div>
        {startingPrice ? (
          <p className="font-outfit text-base font-extrabold text-ink">{startingPrice}</p>
        ) : (
          <p className="text-sm text-gray-700">{priceRange(vendor.services)}</p>
        )}
        <Link
          href={href}
          className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-action px-4 py-2.5 font-outfit text-sm font-bold text-white transition hover:opacity-90"
        >
          View Profile
        </Link>
      </div>
    </div>
  )
}
