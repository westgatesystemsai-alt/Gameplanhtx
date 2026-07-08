import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsActions from './settings-actions'

export const dynamic = 'force-dynamic'

const TIER_LABEL: Record<string, string> = { base: 'Base', pro: 'Pro', premium: 'Premium' }
const TIER_PRICE: Record<string, string> = { base: 'Free', pro: '$49/mo', premium: '$99/mo' }

export default async function VendorSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ subscription?: string }>
}) {
  const { subscription } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, tier, subscription_id')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!vendor) redirect('/apply')

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {subscription === 'success' && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          Subscription updated successfully.
        </div>
      )}
      {subscription === 'cancelled' && (
        <div className="mt-4 rounded-lg bg-gray-100 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Checkout cancelled — no changes were made.
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500">Current plan</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-bold">{TIER_LABEL[vendor.tier]}</p>
          <span className="text-sm text-gray-500">{TIER_PRICE[vendor.tier]}</span>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Tiers unlock features like featured placement and analytics — every vendor is ranked
          the same way regardless of plan.
        </p>

        <SettingsActions currentTier={vendor.tier} hasSubscription={Boolean(vendor.subscription_id)} />
      </div>
    </main>
  )
}
