import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import ConnectActions from './connect-actions'

// Vendor Stripe Connect onboarding page. Status is checked server-side
// against Stripe on every load so a vendor returning from onboarding
// sees the fresh state even before the account.updated webhook lands.
export default async function ConnectPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, business_name, stripe_account_id, stripe_onboarded')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!vendor) redirect('/apply')

  let onboarded = false
  if (vendor.stripe_account_id) {
    try {
      const account = await getStripe().accounts.retrieve(
        vendor.stripe_account_id
      )
      onboarded = Boolean(account.charges_enabled)
    } catch {
      onboarded = vendor.stripe_onboarded
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Payments</h1>
      <p className="mt-2 text-gray-600">
        Game Plan HTX uses Stripe to pay you directly when a planner books
        your services. Payouts go straight to your bank account.
      </p>

      <div className="mt-8 rounded-lg border border-gray-200 p-6">
        {onboarded ? (
          <>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              <p className="font-semibold text-green-700">Connected</p>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Your Stripe account is set up and ready to receive payments.
            </p>
          </>
        ) : vendor.stripe_account_id ? (
          <>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <p className="font-semibold text-yellow-700">
                Onboarding incomplete
              </p>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              You started connecting Stripe but haven&apos;t finished.
              Continue where you left off.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" />
              <p className="font-semibold text-gray-700">Not connected</p>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Connect a Stripe account to start accepting bookings and
              receiving payouts.
            </p>
          </>
        )}

        <ConnectActions
          onboarded={onboarded}
          hasAccount={Boolean(vendor.stripe_account_id)}
        />
      </div>
    </main>
  )
}
