import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Calendar, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'

export const dynamic = 'force-dynamic'

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Planner overview: upcoming bookings + active conversation counts, plus
// a peek at the most recent bookings.
export default async function PlannerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: profile }, { data: upcomingBookings }, { count: activeConversations }, { data: recentBookings }] =
    await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      supabase
        .from('bookings')
        .select('id')
        .eq('planner_id', user.id)
        .eq('booking_status', 'confirmed')
        .gte('event_date', today),
      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('planner_id', user.id)
        .eq('status', 'active'),
      supabase
        .from('bookings')
        .select('*, vendor:vendors(business_name)')
        .eq('planner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4),
    ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">
        Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Here&apos;s what&apos;s happening with your events.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/bookings"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar size={16} />
            <span className="text-sm font-medium">Upcoming bookings</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{upcomingBookings?.length ?? 0}</p>
        </Link>
        <Link
          href="/dashboard/messages"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-2 text-gray-500">
            <MessageSquare size={16} />
            <span className="text-sm font-medium">Active conversations</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{activeConversations ?? 0}</p>
        </Link>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent bookings</h2>
          <Link href="/dashboard/bookings" className="text-sm font-medium text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        {recentBookings?.length ? (
          <ul className="mt-3 space-y-3">
            {recentBookings.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/dashboard/bookings/${b.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
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
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
            No bookings yet.{' '}
            <Link href="/vendors" className="font-medium text-blue-600 hover:underline">
              Browse vendors
            </Link>{' '}
            to get started.
          </div>
        )}
      </div>
    </main>
  )
}
