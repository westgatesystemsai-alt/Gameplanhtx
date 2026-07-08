import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { getAuthenticatedVendor } from '@/lib/stripe/vendor'
import { createAdminClient } from '@/lib/supabase/admin'

// Reports whether the vendor's Connect account has completed onboarding.
// Also syncs vendors.stripe_onboarded when Stripe disagrees with the DB
// (the account.updated webhook normally keeps it fresh).
export async function GET() {
  const { vendor, error } = await getAuthenticatedVendor()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (!vendor.stripe_account_id) {
    return NextResponse.json({ connected: false, onboarded: false })
  }

  try {
    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(vendor.stripe_account_id)
    const onboarded = Boolean(account.charges_enabled)

    if (onboarded !== vendor.stripe_onboarded) {
      const admin = createAdminClient()
      await admin
        .from('vendors')
        .update({ stripe_onboarded: onboarded })
        .eq('id', vendor.id)
    }

    return NextResponse.json({
      connected: true,
      onboarded,
      details_submitted: Boolean(account.details_submitted),
      payouts_enabled: Boolean(account.payouts_enabled),
    })
  } catch (err) {
    console.error('connect/status error:', err)
    return NextResponse.json(
      { error: 'Could not check Stripe account status.' },
      { status: 500 }
    )
  }
}
