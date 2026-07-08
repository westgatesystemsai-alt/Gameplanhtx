import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Ensures a planner profile exists after Supabase signUp. The DB trigger
// normally creates it; this reconciles in case the trigger is missing or
// the metadata was incomplete. Never changes the role of an existing profile.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let body: { user_id?: string; full_name?: string; email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { user_id, full_name, email } = body
  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required.' }, { status: 400 })
  }
  if (user.id !== user_id) {
    return NextResponse.json(
      { error: 'You can only register your own account.' },
      { status: 403 }
    )
  }

  const admin = createAdminClient()

  // Verify the user actually exists in auth before touching profiles.
  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(user_id)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Unknown user.' }, { status: 404 })
  }

  const { data: existing } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('id', user_id)
    .maybeSingle()

  if (existing) {
    if (!existing.full_name && full_name) {
      await admin.from('profiles').update({ full_name }).eq('id', user_id)
    }
    return NextResponse.json({ ok: true })
  }

  const { error: insertError } = await admin.from('profiles').insert({
    id: user_id,
    role: 'planner',
    full_name: full_name ?? null,
    email: email ?? userData.user.email ?? null,
  })

  if (insertError) {
    return NextResponse.json(
      { error: 'Could not create profile.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
