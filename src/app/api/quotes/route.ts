import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendQuoteReceivedEmail } from '@/lib/resend/emails'
import type { Quote } from '@/types'
import { computeQuoteSplit } from '@/lib/quotes/fees'

// POST /api/quotes — vendor creates a quote in a conversation.
// platform_fee and vendor_payout are always server-computed.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let payload: {
    conversation_id?: string
    service_id?: string | null
    event_date?: string
    event_type?: string | null
    guest_count?: number | null
    description?: string | null
    amount?: number
  }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { conversation_id, service_id, event_date, event_type, guest_count, description } = payload
  const amount = Number(payload.amount)

  if (!conversation_id || !event_date) {
    return NextResponse.json(
      { error: 'conversation_id and event_date are required.' },
      { status: 400 }
    )
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'amount must be a positive number.' },
      { status: 400 }
    )
  }

  // The caller must be the vendor on this conversation.
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, business_name')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!vendor) {
    return NextResponse.json(
      { error: 'Only vendors can create quotes.' },
      { status: 403 }
    )
  }

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, planner_id, vendor_id')
    .eq('id', conversation_id)
    .maybeSingle()
  if (!conversation || conversation.vendor_id !== vendor.id) {
    return NextResponse.json(
      { error: 'Conversation not found.' },
      { status: 404 }
    )
  }

  const { platform_fee, vendor_payout } = computeQuoteSplit(amount)

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      conversation_id,
      vendor_id: vendor.id,
      planner_id: conversation.planner_id,
      service_id: service_id || null,
      event_date,
      event_type: event_type || null,
      guest_count: guest_count ?? null,
      description: description || null,
      amount: Math.round(amount * 100) / 100,
      platform_fee,
      vendor_payout,
    })
    .select('*')
    .single<Quote>()

  if (error || !quote) {
    console.error('POST /api/quotes failed', error)
    return NextResponse.json({ error: 'Could not create quote.' }, { status: 500 })
  }

  await supabase
    .from('conversations')
    .update({ last_message_at: quote.created_at })
    .eq('id', conversation_id)

  // Notification email — best effort, never fails the request. `profiles`
  // RLS only allows reading your own row, so the planner's email is
  // looked up with the service-role client.
  if (conversation.planner_id) {
    const admin = createAdminClient()
    const { data: plannerProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', conversation.planner_id)
      .maybeSingle()

    if (plannerProfile?.email) {
      await sendQuoteReceivedEmail({
        to: plannerProfile.email,
        plannerName: plannerProfile.full_name ?? 'there',
        vendorBusinessName: vendor.business_name,
        amount: quote.amount,
        eventDate: quote.event_date,
        conversationId: conversation_id,
      })
    }
  }

  return NextResponse.json({ quote }, { status: 201 })
}
