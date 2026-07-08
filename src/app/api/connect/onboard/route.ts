import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { getAuthenticatedVendor } from '@/lib/stripe/vendor'
import { createAdminClient } from '@/lib/supabase/admin'

// Creates a Stripe Express account for the vendor (reusing an existing
// one if present) and returns an AccountLink URL for onboarding redirect.
export async function POST() {
  const { vendor, error } = await getAuthenticatedVendor()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  try {
    let accountId = vendor.stripe_account_id

    if (!accountId) {
      // card_payments + transfers must be requested explicitly or
      // destination charges to this account are rejected (verified in
      // test mode).
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { vendorId: vendor.id },
      })
      accountId = account.id

      // stripe_account_id is admin-only under RLS, so write with the
      // service-role client.
      const admin = createAdminClient()
      const { error: dbError } = await admin
        .from('vendors')
        .update({ stripe_account_id: accountId })
        .eq('id', vendor.id)

      if (dbError) {
        return NextResponse.json(
          { error: 'Could not save Stripe account.' },
          { status: 500 }
        )
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/vendor/connect?refresh=true`,
      return_url: `${appUrl}/vendor/dashboard`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error('connect/onboard error:', err)
    return NextResponse.json(
      { error: 'Could not start Stripe onboarding.' },
      { status: 500 }
    )
  }
}
