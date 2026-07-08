import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Quote } from '@/types'

// PUT /api/quotes/[id]/accept — planner accepts a quote, then a
// PaymentIntent is created via the create-intent endpoint and its
// client_secret returned so the payment UI can render immediately.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .maybeSingle<Quote>()

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
  }
  if (quote.planner_id !== user.id) {
    return NextResponse.json(
      { error: 'Only the planner can accept this quote.' },
      { status: 403 }
    )
  }
  if (quote.status === 'declined' || quote.status === 'expired') {
    return NextResponse.json(
      { error: `Quote is ${quote.status} and cannot be accepted.` },
      { status: 409 }
    )
  }
  if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Quote has expired.' }, { status: 409 })
  }

  if (quote.status !== 'accepted') {
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'accepted' })
      .eq('id', id)
    if (error) {
      console.error('PUT /api/quotes/[id]/accept failed', error)
      return NextResponse.json(
        { error: 'Could not accept quote.' },
        { status: 500 }
      )
    }
  }

  // Delegate payment creation to the existing create-intent endpoint so
  // amount validation and idempotency live in one place. Forward the
  // caller's cookies so it runs as the same user.
  const intentRes = await fetch(new URL('/api/payments/create-intent', request.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: request.headers.get('cookie') ?? '',
    },
    body: JSON.stringify({ quoteId: id }),
    cache: 'no-store',
  })
  const intent = await intentRes.json().catch(() => null)

  if (!intentRes.ok || !intent?.clientSecret) {
    console.error('accept: create-intent failed', intentRes.status, intent)
    return NextResponse.json(
      {
        quote: { ...quote, status: 'accepted' },
        error: intent?.error ?? 'Quote accepted, but payment setup failed.',
      },
      { status: 502 }
    )
  }

  return NextResponse.json({
    quote: { ...quote, status: 'accepted' },
    client_secret: intent.clientSecret,
    payment_intent_id: intent.paymentIntentId,
    amount: intent.amount,
  })
}
