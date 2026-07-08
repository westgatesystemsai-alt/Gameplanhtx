import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Inbox, FileText, CalendarClock, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'

export const dynamic = 'force-dynamic'

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Vendor overview: new inquiries, pending quotes, upcoming bookings, and
// this month's earnings, plus a peek at recent bookings.
export default async function VendorDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, business_name')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!vendor) redirect('/apply')

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    { data: activeConversations },
    { count: pendingQuotes },
    { data: upcomingBookings },
    { data: monthBookings },
    { data: recentBookings },
  ] = await Promise.all([
    supabase.from('conversations').select('id').eq('vendor_id', vendor.id).eq('status', 'active'),
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendor.id)
      .eq('status', 'pending'),
    supabase
      .from('bookings')
      .select('id')
      .eq('vendor_id', vendor.id)
      .eq('booking_status', 'confirmed')
      .gte('event_date', today),
    supabase
      .from('bookings')
      .select('vendor_payout')
      .eq('vendor_id', vendor.id)
      .eq('payment_status', 'paid')
      .gte('created_at', monthStart.toISOString()),
    supabase
      .from('bookings')
      .select('*, planner:profiles!bookings_planner_id_fkey(full_name)')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  // "New inquiries" = active conversations with an unread message from
  // the planner (mirrors the unread-count logic in /api/conversations).
  const conversationIds = (activeConversations ?? []).map((c) => c.id)
  let newInquiries = 0
  if (conversationIds.length) {
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', user.id)
      .is('read_at', null)
    newInquiries = new Set((unreadMessages ?? []).map((m) => m.conversation_id)).size
  }

  const monthEarnings = (monthBookings ?? []).reduce(
    (sum, b) => sum + Number(b.vendor_payout),
    0
  )

  const cards = [
    { label: 'New inquiries', value: newInquiries, icon: Inbox, href: '/vendor/messages' },
    { label: 'Pending quotes', value: pendingQuotes ?? 0, icon: FileText, href: '/vendor/quotes' },
    {
      label: 'Upcoming bookings',
      value: upcomingBookings?.length ?? 0,
      icon: CalendarClock,
      href: '/vendor/bookings',
    },
    {
      label: "This month's earnings",
      value: usd(monthEarnings),
      icon: DollarSign,
      href: '/vendor/earnings',
    },
  ]

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">{vendor.business_name}</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Here&apos;s how your business is doing.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-2 text-gray-500">
              <Icon size={16} />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent bookings</h2>
          <Link href="/vendor/bookings" className="text-sm font-medium text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        {recentBookings?.length ? (
          <ul className="mt-3 space-y-3">
            {recentBookings.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/vendor/bookings/${b.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{b.planner?.full_name ?? 'Planner'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(`${b.event_date}T00:00:00`).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold">{usd(b.vendor_payout)}</span>
                    <StatusBadge status={b.booking_status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
            No bookings yet.
          </div>
        )}
      </div>
    </main>
  )
}
