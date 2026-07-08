import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Quote } from '@/types'

// GET /api/quotes/[id] — quote detail. RLS restricts to participants.
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

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .maybeSingle<Quote>()

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
  }
  return NextResponse.json({ quote })
}
