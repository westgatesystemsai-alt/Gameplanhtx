import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend/client'
import {
  sendBookingConfirmedPlannerEmail,
  sendBookingConfirmedVendorEmail,
} from '@/lib/resend/emails'
import type { Quote, VendorTier } from '@/types'

// Stripe webhook handler. Signature is verified before any event is
// processed; unhandled event types are acknowledged with 200 so Stripe
// stops retrying them.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    // Will be configured post-deploy; refuse events until then.
    console.error('STRIPE_WEBHOOK_SECRET is not set — rejecting webhook.')
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    const rawBody = await request.text()
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      case 'payment_intent.payment_failed':
        console.warn(
          'Payment failed:',
          event.data.object.id,
          event.data.object.last_payment_error?.message
        )
        break
      case 'transfer.created':
        await handleTransferCreated(stripe, event.data.object)
        break
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object)
        break
      case 'account.updated':
        await handleAccountUpdated(event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      default:
        break
    }
  } catch (err) {
    // Non-2xx makes Stripe retry with backoff — desired for transient
    // DB failures since handlers are idempotent.
    console.error(`Webhook handler failed for ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// payment_intent.succeeded → create booking (idempotent on the payment
// intent id), mark quote accepted, send confirmation emails.
async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const quoteId = pi.metadata?.quoteId
  if (!quoteId) {
    console.error('payment_intent.succeeded without quoteId metadata:', pi.id)
    return
  }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('bookings')
    .select('id')
    .eq('stripe_payment_intent_id', pi.id)
    .maybeSingle()
  if (existing) return // already processed (webhook retry)

  const { data: quote, error: quoteError } = await admin
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .maybeSingle<Quote>()
  if (quoteError || !quote) {
    throw new Error(`Quote ${quoteId} not found for PI ${pi.id}`)
  }

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      quote_id: quote.id,
      planner_id: quote.planner_id,
      vendor_id: quote.vendor_id,
      event_date: quote.event_date,
      amount: quote.amount,
      platform_fee: quote.platform_fee,
      vendor_payout: quote.vendor_payout,
      stripe_payment_intent_id: pi.id,
      payment_status: 'paid',
      booking_status: 'confirmed',
    })
    .select('id')
    .single()
  if (bookingError) {
    throw new Error(`Booking insert failed: ${bookingError.message}`)
  }

  await admin.from('quotes').update({ status: 'accepted' }).eq('id', quote.id)
  await admin
    .from('conversations')
    .update({ status: 'booked' })
    .eq('id', quote.conversation_id ?? '')

  // Confirmation emails — best effort, never fail the webhook.
  const { data: vendor } = await admin
    .from('vendors')
    .select('business_name, profile_id')
    .eq('id', quote.vendor_id ?? '')
    .maybeSingle()
  const { data: vendorProfile } = vendor
    ? await admin
        .from('profiles')
        .select('email')
        .eq('id', vendor.profile_id)
        .maybeSingle()
    : { data: null }
  const { data: plannerProfile } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', quote.planner_id ?? '')
    .maybeSingle()

  const plannerEmail = plannerProfile?.email ?? pi.metadata?.plannerEmail

  if (plannerEmail) {
    await sendBookingConfirmedPlannerEmail({
      to: plannerEmail,
      vendorBusinessName: vendor?.business_name ?? 'your vendor',
      eventDate: quote.event_date,
      amount: quote.amount,
      bookingId: booking.id,
    })
  }
  if (vendorProfile?.email) {
    await sendBookingConfirmedVendorEmail({
      to: vendorProfile.email,
      plannerName: plannerProfile?.full_name ?? 'your planner',
      eventDate: quote.event_date,
      payout: quote.vendor_payout,
      bookingId: booking.id,
    })
  }
}

// transfer.created → attach the transfer id to the booking via the
// source charge's payment intent.
async function handleTransferCreated(stripe: Stripe, transfer: Stripe.Transfer) {
  const sourceCharge =
    typeof transfer.source_transaction === 'string'
      ? transfer.source_transaction
      : transfer.source_transaction?.id
  if (!sourceCharge) return

  const charge = await stripe.charges.retrieve(sourceCharge)
  const piId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id
  if (!piId) return

  const admin = createAdminClient()
  await admin
    .from('bookings')
    .update({ stripe_transfer_id: transfer.id })
    .eq('stripe_payment_intent_id', piId)
}

// charge.dispute.created → flag booking as disputed and alert admin.
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const piId =
    typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id

  const admin = createAdminClient()
  let bookingId: string | null = null
  if (piId) {
    const { data } = await admin
      .from('bookings')
      .update({ payment_status: 'disputed' })
      .eq('stripe_payment_intent_id', piId)
      .select('id')
      .maybeSingle()
    bookingId = data?.id ?? null
  }

  const adminEmail = process.env.ADMIN_ALERT_EMAIL
  console.error('DISPUTE CREATED:', dispute.id, 'booking:', bookingId)
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `⚠️ Dispute created — ${dispute.id}`,
      html: `<p>A dispute was created for ${((dispute.amount ?? 0) / 100).toFixed(2)} USD.</p><p>Dispute: ${dispute.id}<br/>PaymentIntent: ${piId ?? 'unknown'}<br/>Booking: ${bookingId ?? 'not found'}<br/>Reason: ${dispute.reason}</p><p>Respond in the Stripe Dashboard before ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toUTCString() : 'the deadline'}.</p>`,
    })
  }
}

// account.updated → sync vendors.stripe_onboarded.
async function handleAccountUpdated(account: Stripe.Account) {
  const admin = createAdminClient()
  await admin
    .from('vendors')
    .update({ stripe_onboarded: Boolean(account.charges_enabled) })
    .eq('stripe_account_id', account.id)
}

// Maps a subscription's price lookup_key/metadata to a vendor tier.
function tierFromSubscription(sub: Stripe.Subscription): VendorTier | null {
  const key = sub.items.data[0]?.price?.lookup_key ?? ''
  if (key.includes('premium')) return 'premium'
  if (key.includes('pro')) return 'pro'
  return null
}

// customer.subscription.updated → set vendor tier + subscription id.
async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const vendorId = sub.metadata?.vendorId
  if (!vendorId) return

  const admin = createAdminClient()
  const active = sub.status === 'active' || sub.status === 'trialing'
  const tier = active ? tierFromSubscription(sub) : null

  await admin
    .from('vendors')
    .update({
      tier: tier ?? 'base',
      subscription_id: active ? sub.id : null,
    })
    .eq('id', vendorId)
}

// customer.subscription.deleted → revert vendor to base tier.
async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const admin = createAdminClient()
  const vendorId = sub.metadata?.vendorId
  const query = admin
    .from('vendors')
    .update({ tier: 'base', subscription_id: null })
  if (vendorId) {
    await query.eq('id', vendorId)
  } else {
    await query.eq('subscription_id', sub.id)
  }
}
