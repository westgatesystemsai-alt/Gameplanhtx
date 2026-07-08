import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Conversation, Message } from '@/types'

// GET /api/conversations — list conversations for the current user.
// Planners see their inquiries; vendors see all inbound. Each row is
// enriched with the other party's name, last message preview, and
// unread count.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  // RLS limits rows to conversations the user participates in.
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(
      `*,
       vendor:vendors(id, business_name, profile_id),
       planner:profiles!conversations_planner_id_fkey(id, full_name)`
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('GET /api/conversations failed', error)
    return NextResponse.json(
      { error: 'Could not load conversations.' },
      { status: 500 }
    )
  }

  const ids = (conversations ?? []).map((c) => c.id)
  let messages: Pick<
    Message,
    'conversation_id' | 'sender_id' | 'body' | 'read_at' | 'created_at'
  >[] = []
  if (ids.length > 0) {
    const { data } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, body, read_at, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
    messages = data ?? []
  }

  const enriched = (conversations ?? []).map((c) => {
    const msgs = messages.filter((m) => m.conversation_id === c.id)
    const last = msgs[0] ?? null
    const unread_count = msgs.filter(
      (m) => m.sender_id !== user.id && m.read_at === null
    ).length
    return {
      ...c,
      last_message: last ? { body: last.body, created_at: last.created_at } : null,
      unread_count,
    }
  })

  return NextResponse.json({ conversations: enriched })
}

// POST /api/conversations — planner starts a conversation with a vendor.
// Idempotent on the (planner, vendor) pair: returns the existing
// conversation if one already exists.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let vendorId: string | undefined
  let initialMessage: string | undefined
  try {
    const body = await request.json()
    vendorId = body.vendor_id ?? body.vendorId
    initialMessage = body.message
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  if (!vendorId) {
    return NextResponse.json({ error: 'vendor_id is required.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('planner_id', user.id)
    .eq('vendor_id', vendorId)
    .maybeSingle<Conversation>()

  if (existing) {
    return NextResponse.json({ conversation: existing, created: false })
  }

  // RLS insert policy enforces planner_id = auth.uid() and that the
  // vendor is approved.
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({ planner_id: user.id, vendor_id: vendorId })
    .select('*')
    .single<Conversation>()

  if (error || !conversation) {
    // Unique-violation race: another request created it first.
    if (error?.code === '23505') {
      const { data: raced } = await supabase
        .from('conversations')
        .select('*')
        .eq('planner_id', user.id)
        .eq('vendor_id', vendorId)
        .maybeSingle<Conversation>()
      if (raced) return NextResponse.json({ conversation: raced, created: false })
    }
    console.error('POST /api/conversations failed', error)
    return NextResponse.json(
      { error: 'Could not start conversation.' },
      { status: 500 }
    )
  }

  if (initialMessage?.trim()) {
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      body: initialMessage.trim(),
    })
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id)
  }

  return NextResponse.json({ conversation, created: true }, { status: 201 })
}
