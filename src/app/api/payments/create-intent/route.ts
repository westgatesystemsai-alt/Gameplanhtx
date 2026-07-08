import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Quote, Vendor } from '@/types'

const PLATFORM_FEE_PERCENT = Number(
  process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT ?? '7.5'
)

const toCents = (dollars: number) => Math.round(dollars * 100)

// Creates a destination-charge PaymentIntent for an accepted quote.
// Amounts come from the quote row; they are re-validated here so a bad
// quote record can never move the wrong amount of money.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let quoteId: string | undefined
  try {
    ;({ quoteId } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  if (!quoteId) {
    return NextResponse.json({ error: 'quoteId is required.' }, { status: 400 })
  }

  // Service-role read: quote + vendor payout fields are needed regardless
  // of RLS visibility rules; ownership is enforced explicitly below.
  const admin = createAdminClient()
  const { data: quote } = await admin
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .maybeSingle<Quote>()

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
  }
  if (quote.planner_id !== user.id) {
    return NextResponse.json(
      { error: 'This quote does not belong to you.' },
      { status: 403 }
    )
  }
  if (quote.status === 'declined' || quote.status === 'expired') {
    return NextResponse.json(
      { error: `Quote is ${quote.status} and can no longer be paid.` },
      { status: 409 }
    )
  }
  if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Quote has expired.' }, { status: 409 })
  }

  const { data: vendor } = await admin
    .from('vendors')
    .select('*')
    .eq('id', quote.vendor_id)
    .maybeSingle<Vendor>()

  if (!vendor?.stripe_account_id || !vendor.stripe_onboarded) {
    return NextResponse.json(
      { error: 'Vendor has not completed Stripe onboarding.' },
      { status: 409 }
    )
  }

  // Money-math guardrails: fee must be the platform rate and the split
  // must add up exactly. Reject rather than guess.
  const amountCents = toCents(quote.amount)
  const feeCents = toCents(quote.platform_fee)
  const payoutCents = toCents(quote.vendor_payout)
  const expectedFeeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100))

  if (
    amountCents <= 0 ||
    feeCents + payoutCents !== amountCents ||
    Math.abs(feeCents - expectedFeeCents) > 1 // allow 1¢ rounding drift
  ) {
    console.error('create-intent amount mismatch', {
      quoteId,
      amountCents,
      feeCents,
      payoutCents,
      expectedFeeCents,
    })
    return NextResponse.json(
      { error: 'Quote amounts are inconsistent. Contact support.' },
      { status: 422 }
    )
  }

  try {
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        transfer_data: {
          destination: vendor.stripe_account_id,
          amount: payoutCents,
        },
        metadata: {
          quoteId: quote.id,
          vendorId: vendor.id,
          plannerId: user.id,
          plannerEmail: user.email ?? '',
        },
      },
      // Same quote → same PaymentIntent on retry/refresh.
      { idempotencyKey: `quote_pi_${quote.id}` }
    )

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountCents,
    })
  } catch (err) {
    console.error('payments/create-intent error:', err)
    return NextResponse.json(
      { error: 'Could not create payment.' },
      { status: 500 }
    )
  }
}
