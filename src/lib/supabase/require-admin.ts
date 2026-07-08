import 'server-only'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Confirms the caller is authenticated with the admin role. Used at the
// top of every /api/admin/* route, ahead of any service-role write.
export async function requireAdmin(): Promise<{ user: User } | { error: NextResponse }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }
  }

  return { user }
}
