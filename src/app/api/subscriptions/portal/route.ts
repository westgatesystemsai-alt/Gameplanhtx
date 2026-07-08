import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { getAuthenticatedVendor } from '@/lib/stripe/vendor'

// Returns a Stripe Billing Portal URL so the vendor can manage or
// cancel their subscription.
export async function POST() {
  const { vendor, error } = await getAuthenticatedVendor()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (!vendor.subscription_id) {
    return NextResponse.json(
      { error: 'No active subscription.' },
      { status: 400 }
    )
  }

  try {
    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(
      vendor.subscription_id
    )
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('subscriptions/portal error:', err)
    return NextResponse.json(
      { error: 'Could not open billing portal.' },
      { status: 500 }
    )
  }
}
