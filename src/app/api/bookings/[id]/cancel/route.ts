import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'

// PUT /api/bookings/[id]/cancel — cancel a confirmed booking. If it was
// paid, reverses the destination charge (refunds the planner and pulls
// back the vendor's transferred portion) before flipping status.
export async function PUT(
  _request: Request,
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

  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('*, vendor:vendors(profile_id)')
    .eq('id', id)
    .maybeSingle()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  const isPlanner = booking.planner_id === user.id
  const isVendor = booking.vendor?.profile_id === user.id
  if (!isPlanner && !isVendor) {
    return NextResponse.json({ error: 'You are not part of this booking.' }, { status: 403 })
  }
  if (booking.booking_status !== 'confirmed') {
    return NextResponse.json(
      { error: `Booking is already ${booking.booking_status}.` },
      { status: 409 }
    )
  }

  let paymentStatus = booking.payment_status
  if (booking.payment_status === 'paid' && booking.stripe_payment_intent_id) {
    try {
      const stripe = getStripe()
      await stripe.refunds.create(
        {
          payment_intent: booking.stripe_payment_intent_id,
          reverse_transfer: true,
        },
        { idempotencyKey: `booking_cancel_refund_${booking.id}` }
      )
      paymentStatus = 'refunded'
    } catch (err) {
      console.error('bookings/cancel refund failed', err)
      return NextResponse.json(
        { error: 'Could not process refund. Booking was not cancelled.' },
        { status: 502 }
      )
    }
  }

  const { data: updated, error } = await admin
    .from('bookings')
    .update({ booking_status: 'cancelled', payment_status: paymentStatus })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !updated) {
    console.error('PUT /api/bookings/[id]/cancel failed', error)
    return NextResponse.json({ error: 'Could not cancel booking.' }, { status: 500 })
  }

  return NextResponse.json({ booking: updated })
}
