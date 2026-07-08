import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Calendar, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'
import BookingActions from '@/components/ui/BookingActions'

export const dynamic = 'force-dynamic'

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Vendor booking detail with payout info: total charged, platform fee,
// vendor payout, and whether the Stripe transfer has landed.
export default async function VendorBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!vendor) redirect('/apply')

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, planner:profiles!bookings_planner_id_fkey(full_name)')
    .eq('id', id)
    .eq('vendor_id', vendor.id)
    .maybeSingle()
  if (!booking) notFound()

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/vendor/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:underline dark:text-gray-400"
      >
        <ArrowLeft size={15} /> Back to bookings
      </Link>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Booking</p>
            <h1 className="mt-1 text-2xl font-bold">{booking.planner?.full_name ?? 'Planner'}</h1>
          </div>
          <StatusBadge status={booking.booking_status} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Event date</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
              <Calendar size={14} />
              {new Date(`${booking.event_date}T00:00:00`).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Total charged</dt>
            <dd className="mt-0.5 font-medium">{usd(booking.amount)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Platform fee</dt>
            <dd className="mt-0.5 font-medium">−{usd(booking.platform_fee)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Your payout</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-green-700 dark:text-green-400">
              <DollarSign size={14} /> {usd(booking.vendor_payout)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Payment status</dt>
            <dd className="mt-0.5">
              <StatusBadge status={booking.payment_status} />
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Payout status</dt>
            <dd className="mt-0.5 font-medium">
              {booking.stripe_transfer_id
                ? 'Transferred'
                : booking.payment_status === 'paid'
                  ? 'Processing'
                  : '—'}
            </dd>
          </div>
        </dl>

        {booking.booking_status === 'confirmed' && (
          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
            <BookingActions bookingId={booking.id} showComplete showCancel />
          </div>
        )}
      </div>
    </main>
  )
}
