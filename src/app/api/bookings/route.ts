import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/bookings — list bookings for the current user. Planners see
// bookings where they're the planner; vendors see bookings for their
// vendor account. RLS additionally scopes every row to a participant.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  let query = supabase
    .from('bookings')
    .select(
      `*,
       vendor:vendors(id, business_name),
       planner:profiles!bookings_planner_id_fkey(id, full_name)`
    )
    .order('event_date', { ascending: false })

  query = vendor ? query.eq('vendor_id', vendor.id) : query.eq('planner_id', user.id)

  const { data: bookings, error } = await query

  if (error) {
    console.error('GET /api/bookings failed', error)
    return NextResponse.json({ error: 'Could not load bookings.' }, { status: 500 })
  }

  return NextResponse.json({ bookings: bookings ?? [] })
}
