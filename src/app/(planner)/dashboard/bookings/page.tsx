import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'

export const dynamic = 'force-dynamic'

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default async function PlannerBookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, vendor:vendors(business_name)')
    .eq('planner_id', user.id)
    .order('event_date', { ascending: false })

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Your bookings</h1>

      {!bookings?.length ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700">
          No bookings yet.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/dashboard/bookings/${b.id}`}
                className="flex items-center justify-between gap-3 p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{b.vendor?.business_name ?? 'Vendor'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(`${b.event_date}T00:00:00`).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold">{usd(b.amount)}</span>
                  <StatusBadge status={b.booking_status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
