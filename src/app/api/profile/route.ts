import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

// PUT /api/profile — update the caller's own name, contact email, and
// phone. RLS scopes this to the authenticated user's own row.
export async function PUT(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let payload: { full_name?: string; email?: string; phone?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      full_name: payload.full_name?.trim() || null,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
    })
    .eq('id', user.id)
    .select('*')
    .single<Profile>()

  if (error || !profile) {
    console.error('PUT /api/profile failed', error)
    return NextResponse.json({ error: 'Could not save profile.' }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
