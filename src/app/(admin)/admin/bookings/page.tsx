import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'
import StatusBadge from '@/components/ui/StatusBadge'
import BookingsFilter from './bookings-filter'
import type { BookingStatus } from '@/types'

export const dynamic = 'force-dynamic'

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const BOOKING_STATUSES: BookingStatus[] = ['confirmed', 'completed', 'cancelled']

// All platform bookings, filterable by booking status and event date range.
export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>
}) {
  const { status, from, to } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('bookings')
    .select(
      '*, planner:profiles!bookings_planner_id_fkey(full_name), vendor:vendors(business_name)'
    )
    .order('event_date', { ascending: false })

  if (status && BOOKING_STATUSES.includes(status as BookingStatus)) {
    query = query.eq('booking_status', status)
  }
  if (from) query = query.gte('event_date', from)
  if (to) query = query.lte('event_date', to)

  const { data: bookings } = await query

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Bookings</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">All platform bookings.</p>

      <div className="mt-6">
        <AdminNav active="/admin/bookings" />
      </div>

      <Suspense>
        <BookingsFilter />
      </Suspense>

      {!bookings?.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700">
          No bookings match these filters.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Planner</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Event date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">{b.planner?.full_name ?? 'Planner'}</td>
                  <td className="px-4 py-3">{b.vendor?.business_name ?? 'Vendor'}</td>
                  <td className="px-4 py-3">
                    {new Date(`${b.event_date}T00:00:00`).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium">{usd(b.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.booking_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
