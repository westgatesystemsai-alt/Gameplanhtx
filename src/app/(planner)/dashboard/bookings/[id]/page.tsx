import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Calendar, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'
import BookingActions from '@/components/ui/BookingActions'
import LeaveReviewForm from '@/components/planner/LeaveReviewForm'

export const dynamic = 'force-dynamic'

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Planner booking detail: vendor info, event date, amount paid, status,
// and a review prompt once the booking is complete.
export default async function PlannerBookingDetailPage({
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

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, vendor:vendors(id, business_name, city)')
    .eq('id', id)
    .eq('planner_id', user.id)
    .maybeSingle()
  if (!booking) notFound()

  const { data: review } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', id)
    .maybeSingle()

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:underline dark:text-gray-400"
      >
        <ArrowLeft size={15} /> Back to bookings
      </Link>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Booking</p>
            <h1 className="mt-1 text-2xl font-bold">{booking.vendor?.business_name ?? 'Vendor'}</h1>
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
            <dt className="text-gray-500">Amount paid</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
              <CreditCard size={14} /> {usd(booking.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Payment status</dt>
            <dd className="mt-0.5">
              <StatusBadge status={booking.payment_status} />
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Booked on</dt>
            <dd className="mt-0.5 font-medium">
              {new Date(booking.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </dd>
          </div>
        </dl>

        {booking.booking_status === 'confirmed' && (
          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
            <BookingActions bookingId={booking.id} showCancel />
          </div>
        )}
      </div>

      {booking.booking_status === 'completed' && !review && (
        <div className="mt-6">
          <LeaveReviewForm bookingId={booking.id} />
        </div>
      )}
    </main>
  )
}
