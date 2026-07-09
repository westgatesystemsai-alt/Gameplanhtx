import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Inbox, FileText, CalendarClock, DollarSign, Eye, MessageSquare, Clock, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'
import { isVendorVerified } from '@/lib/vendors/verified'

export const dynamic = 'force-dynamic'

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Turns a response_rate (avg first-reply time in hours) into the
// dashboard label + colored quality tag. Distinct from the public
// ResponseTimeBadge, which hides anything slower than 24 hrs.
function responseTimeTag(rate: number): { label: string; color: string } {
  if (rate <= 2) return { label: 'Excellent', color: '#1A7F5A' }
  if (rate <= 24) return { label: 'Good', color: '#F0B429' }
  return { label: 'Needs attention', color: '#DC2626' }
}

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
    .select('id, business_name, response_rate, verified_items')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!vendor) redirect('/apply')

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString()

  // ── My Stats data ──────────────────────────────────────────────
  // Profile views + inquiries in the last 30 days, and the category
  // benchmark for response time. Categories are fetched first so peer
  // vendors can be scoped to the same categories.
  const { data: myCategories } = await supabase
    .from('vendor_categories')
    .select('category_id')
    .eq('vendor_id', vendor.id)
  const categoryIds = (myCategories ?? []).map((c) => c.category_id)

  const [{ count: profileViews }, { count: inquiriesReceived }, { data: peerCategoryRows }] =
    await Promise.all([
      supabase
        .from('vendor_profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
        .gte('viewed_at', since),
      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
        .gte('created_at', since),
      categoryIds.length
        ? supabase.from('vendor_categories').select('vendor_id').in('category_id', categoryIds)
        : Promise.resolve({ data: [] as { vendor_id: string }[] }),
    ])

  // Category Benchmark: average response_rate across approved vendors
  // sharing any of this vendor's categories (a peer in two shared
  // categories is only counted once).
  const peerVendorIds = [...new Set((peerCategoryRows ?? []).map((r) => r.vendor_id))]
  let categoryBenchmark: number | null = null
  if (peerVendorIds.length) {
    const { data: peers } = await supabase
      .from('vendors')
      .select('response_rate')
      .in('id', peerVendorIds)
      .eq('status', 'approved')
      .not('response_rate', 'is', null)
    const rates = (peers ?? []).map((p) => Number(p.response_rate))
    if (rates.length) categoryBenchmark = rates.reduce((a, b) => a + b, 0) / rates.length
  }

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{vendor.business_name}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Here&apos;s how your business is doing.
          </p>
        </div>
        <Link
          href="/vendor/profile"
          className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Edit profile
        </Link>
      </div>

      {/* My Stats — subscription ROI at a glance */}
      <section className="mt-8">
        <h2 className="font-outfit text-lg font-semibold text-ink dark:text-white">My Stats</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Profile views */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-gray-500">
              <Eye size={16} />
              <span className="text-sm font-medium">Profile views</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{profileViews ?? 0}</p>
            <p className="mt-1 text-xs text-gray-500">Last 30 days</p>
          </div>

          {/* Inquiries received */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-gray-500">
              <MessageSquare size={16} />
              <span className="text-sm font-medium">Inquiries received</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{inquiriesReceived ?? 0}</p>
            <p className="mt-1 text-xs text-gray-500">Last 30 days</p>
          </div>

          {/* Your response time */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock size={16} />
              <span className="text-sm font-medium">Your response time</span>
            </div>
            {vendor.response_rate == null ? (
              <p className="mt-2 text-2xl font-bold text-gray-400">No data yet.</p>
            ) : (
              <>
                <p className="mt-2 text-2xl font-bold">
                  ~{Math.round(Number(vendor.response_rate))} hrs
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">avg response time</span>
                  {(() => {
                    const tag = responseTimeTag(Number(vendor.response_rate))
                    return (
                      <span
                        className="rounded-full px-2 py-0.5 font-outfit text-xs font-semibold text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.label}
                      </span>
                    )
                  })()}
                </div>
              </>
            )}
          </div>

          {/* Category benchmark */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-gray-500">
              <BarChart3 size={16} />
              <span className="text-sm font-medium">Category benchmark</span>
            </div>
            {categoryBenchmark == null ? (
              <p className="mt-2 text-2xl font-bold text-gray-400">No data yet.</p>
            ) : (
              <>
                <p className="mt-2 text-2xl font-bold">~{Math.round(categoryBenchmark)} hrs</p>
                <p className="mt-1 text-xs text-gray-500">
                  Category average: ~{Math.round(categoryBenchmark)} hrs
                </p>
              </>
            )}
          </div>
        </div>

        {/* Gameplan Verified nudge */}
        {isVendorVerified(vendor.verified_items) ? (
          <div className="mt-4 rounded-xl border border-verified/30 bg-verified/5 p-4 text-sm font-semibold text-verified">
            You&apos;re Gameplan Verified ✓
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-ink dark:text-amber-100">
              Complete your Gameplan Verified checklist to build planner trust
            </p>
            <Link
              href="/admin/vendors"
              className="shrink-0 rounded-lg bg-action px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Get verified
            </Link>
          </div>
        )}
      </section>

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
