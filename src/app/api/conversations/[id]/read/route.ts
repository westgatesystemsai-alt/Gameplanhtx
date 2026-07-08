import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/conversations/[id]/read — mark all messages sent by the
// other party as read. RLS limits updates to participants.
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

  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('PUT /api/conversations/[id]/read failed', error)
    return NextResponse.json(
      { error: 'Could not mark messages as read.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
