import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/bookings/[id] — booking detail plus its review, if any.
// RLS restricts visibility to the planner or vendor on the booking.
export async function GET(
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

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(
      `*,
       vendor:vendors(id, business_name, profile_id),
       planner:profiles!bookings_planner_id_fkey(id, full_name, email),
       quote:quotes(id, description, event_type, guest_count)`
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('GET /api/bookings/[id] failed', error)
    return NextResponse.json({ error: 'Could not load booking.' }, { status: 500 })
  }
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  const { data: review } = await supabase
    .from('reviews')
    .select('*')
    .eq('booking_id', id)
    .maybeSingle()

  return NextResponse.json({ booking, review: review ?? null })
}
