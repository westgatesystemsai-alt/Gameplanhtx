import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClipboardList, Store, CalendarClock, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'

export const dynamic = 'force-dynamic'

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Admin overview: pending applications, approved vendor count, and this
// month's booking volume + revenue.
export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [{ count: pendingApplications }, { count: totalVendors }, { data: monthBookings }] =
    await Promise.all([
      supabase
        .from('vendor_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('vendors')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('bookings')
        .select('amount, payment_status')
        .gte('created_at', monthStart.toISOString()),
    ])

  const monthRevenue = (monthBookings ?? [])
    .filter((b) => b.payment_status === 'paid')
    .reduce((sum, b) => sum + Number(b.amount), 0)

  const cards = [
    {
      label: 'Pending applications',
      value: pendingApplications ?? 0,
      icon: ClipboardList,
      href: '/admin/applications',
    },
    { label: 'Total vendors', value: totalVendors ?? 0, icon: Store, href: '/admin/vendors' },
    {
      label: 'Bookings this month',
      value: monthBookings?.length ?? 0,
      icon: CalendarClock,
      href: '/admin/bookings',
    },
    {
      label: 'Revenue this month',
      value: usd(monthRevenue),
      icon: DollarSign,
      href: '/admin/bookings',
    },
  ]

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Platform health at a glance.
      </p>

      <div className="mt-6">
        <AdminNav active="/admin/dashboard" />
      </div>

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
    </main>
  )
}
