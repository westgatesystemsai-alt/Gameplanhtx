import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/conversations/[id] — conversation detail with all messages
// and the current (most recent) quote, if any. RLS restricts access to
// participants.
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

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(
      `*,
       vendor:vendors(id, business_name, profile_id),
       planner:profiles!conversations_planner_id_fkey(id, full_name)`
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('GET /api/conversations/[id] failed', error)
    return NextResponse.json(
      { error: 'Could not load conversation.' },
      { status: 500 }
    )
  }
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
  }

  const [{ data: messages }, { data: quotes }] = await Promise.all([
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('quotes')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  return NextResponse.json({
    conversation,
    messages: messages ?? [],
    quote: quotes?.[0] ?? null,
  })
}
