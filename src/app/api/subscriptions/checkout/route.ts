import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { getAuthenticatedVendor } from '@/lib/stripe/vendor'

// Tier pricing per build brief Section 2: Pro $49/mo, Premium $99/mo.
const TIERS = {
  pro: { lookupKey: 'gph_pro_monthly', name: 'Game Plan HTX Pro', amount: 4900 },
  premium: {
    lookupKey: 'gph_premium_monthly',
    name: 'Game Plan HTX Premium',
    amount: 9900,
  },
} as const

// Resolves the recurring price for a tier by lookup_key, creating the
// product/price on first use (test mode; no dashboard setup required).
async function getPriceId(
  stripe: Stripe,
  tier: keyof typeof TIERS
): Promise<string> {
  const cfg = TIERS[tier]
  const found = await stripe.prices.list({
    lookup_keys: [cfg.lookupKey],
    active: true,
    limit: 1,
  })
  if (found.data[0]) return found.data[0].id

  const price = await stripe.prices.create({
    lookup_key: cfg.lookupKey,
    unit_amount: cfg.amount,
    currency: 'usd',
    recurring: { interval: 'month' },
    product_data: { name: cfg.name },
  })
  return price.id
}

// Creates a Stripe Checkout session for a Pro or Premium subscription.
export async function POST(request: Request) {
  const { vendor, error } = await getAuthenticatedVendor()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  let tier: string | undefined
  try {
    ;({ tier } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  if (tier !== 'pro' && tier !== 'premium') {
    return NextResponse.json(
      { error: "tier must be 'pro' or 'premium'." },
      { status: 400 }
    )
  }
  if (vendor.subscription_id) {
    return NextResponse.json(
      { error: 'You already have a subscription. Use the billing portal to change plans.' },
      { status: 409 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  try {
    const stripe = getStripe()
    const priceId = await getPriceId(stripe, tier)

    // Reuse the vendor's Stripe customer if one exists on a prior
    // subscription; otherwise Checkout creates one.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/vendor/settings?subscription=success`,
      cancel_url: `${appUrl}/vendor/settings?subscription=cancelled`,
      client_reference_id: vendor.id,
      metadata: { vendorId: vendor.id, tier },
      // Propagated to the subscription so webhook handlers can map
      // subscription events back to the vendor.
      subscription_data: { metadata: { vendorId: vendor.id, tier } },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('subscriptions/checkout error:', err)
    return NextResponse.json(
      { error: 'Could not start checkout.' },
      { status: 500 }
    )
  }
}
