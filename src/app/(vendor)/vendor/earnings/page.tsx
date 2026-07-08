import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'
import EarningsActions from './earnings-actions'

export const dynamic = 'force-dynamic'

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default async function VendorEarningsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, stripe_onboarded')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!vendor) redirect('/apply')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, event_date, vendor_payout, payment_status, stripe_transfer_id, created_at')
    .eq('vendor_id', vendor.id)
    .in('payment_status', ['paid', 'disputed', 'refunded'])
    .order('created_at', { ascending: false })

  const totalEarned = (bookings ?? [])
    .filter((b) => b.payment_status === 'paid')
    .reduce((sum, b) => sum + Number(b.vendor_payout), 0)

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Earnings</h1>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500">Total earned</p>
        <p className="mt-1 text-3xl font-bold">{usd(totalEarned)}</p>
        <EarningsActions onboarded={Boolean(vendor.stripe_onboarded)} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Payout history</h2>
      {!bookings?.length ? (
        <div className="mt-3 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
          No payouts yet.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {bookings.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{usd(b.vendor_payout)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Event{' '}
                  {new Date(`${b.event_date}T00:00:00`).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <StatusBadge status={b.payment_status} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
