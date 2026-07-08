import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { getAuthenticatedVendor } from '@/lib/stripe/vendor'

// Returns a one-time Stripe Express dashboard login link so the vendor
// can view earnings and payouts.
export async function GET() {
  const { vendor, error } = await getAuthenticatedVendor()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (!vendor.stripe_account_id || !vendor.stripe_onboarded) {
    return NextResponse.json(
      { error: 'Stripe account is not connected yet.' },
      { status: 400 }
    )
  }

  try {
    const stripe = getStripe()
    const loginLink = await stripe.accounts.createLoginLink(
      vendor.stripe_account_id
    )
    return NextResponse.json({ url: loginLink.url })
  } catch (err) {
    console.error('connect/dashboard-link error:', err)
    return NextResponse.json(
      { error: 'Could not create dashboard link.' },
      { status: 500 }
    )
  }
}
