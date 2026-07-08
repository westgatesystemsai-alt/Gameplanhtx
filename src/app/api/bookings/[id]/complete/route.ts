import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend/client'

// PUT /api/bookings/[id]/complete — mark a booking completed post-event.
// Bookings have no client write policies (server-only per RLS), so the
// admin client performs the update after an explicit ownership check.
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
    .select('*, vendor:vendors(profile_id), planner:profiles!bookings_planner_id_fkey(email)')
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
  if (new Date(`${booking.event_date}T00:00:00`) > new Date()) {
    return NextResponse.json(
      { error: 'Cannot mark a booking complete before its event date.' },
      { status: 409 }
    )
  }

  const { data: updated, error } = await admin
    .from('bookings')
    .update({ booking_status: 'completed', review_requested_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !updated) {
    console.error('PUT /api/bookings/[id]/complete failed', error)
    return NextResponse.json({ error: 'Could not complete booking.' }, { status: 500 })
  }

  if (booking.planner?.email) {
    await sendEmail({
      to: booking.planner.email,
      subject: 'How did it go? Leave a review — Game Plan HTX',
      html: `<p>Your event on ${new Date(`${booking.event_date}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'long' })} is complete. Log in to leave a review for your vendor.</p>`,
    })
  }

  return NextResponse.json({ booking: updated })
}
