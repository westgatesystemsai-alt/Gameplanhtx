import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Review } from '@/types'

// POST /api/reviews — planner submits a review for a completed booking.
// RLS also requires the booking's payment_status = 'paid'; this route
// additionally requires booking_status = 'completed' per product rules.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let payload: { booking_id?: string; rating?: number; body?: string | null }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { booking_id, body } = payload
  const rating = Number(payload.rating)
  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id is required.' }, { status: 400 })
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be an integer from 1 to 5.' }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, planner_id, vendor_id, booking_status')
    .eq('id', booking_id)
    .maybeSingle()
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }
  if (booking.planner_id !== user.id) {
    return NextResponse.json(
      { error: 'Only the planner on this booking can leave a review.' },
      { status: 403 }
    )
  }
  if (booking.booking_status !== 'completed') {
    return NextResponse.json(
      { error: 'Booking must be completed before leaving a review.' },
      { status: 409 }
    )
  }

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      booking_id,
      vendor_id: booking.vendor_id,
      planner_id: user.id,
      rating,
      body: body || null,
    })
    .select('*')
    .single<Review>()

  if (error || !review) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'A review already exists for this booking.' },
        { status: 409 }
      )
    }
    console.error('POST /api/reviews failed', error)
    return NextResponse.json({ error: 'Could not submit review.' }, { status: 500 })
  }

  // Recompute the vendor's aggregate rating. vendors.avg_rating /
  // review_count can only be changed by the service role or an admin
  // (see protect_vendor_columns trigger), hence the admin client here.
  const admin = createAdminClient()
  const { data: allReviews } = await admin
    .from('reviews')
    .select('rating')
    .eq('vendor_id', booking.vendor_id)
    .eq('is_published', true)
  const ratings = (allReviews ?? []).map((r) => r.rating)
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
  await admin
    .from('vendors')
    .update({ avg_rating: Math.round(avg * 100) / 100, review_count: ratings.length })
    .eq('id', booking.vendor_id ?? '')

  return NextResponse.json({ review }, { status: 201 })
}
