import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewMessageEmail } from '@/lib/resend/emails'
import type { Message } from '@/types'

// POST /api/conversations/[id]/messages — send a message and bump
// conversations.last_message_at. RLS enforces sender is a participant.
export async function POST(
  request: Request,
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

  let body: string | undefined
  try {
    ;({ body } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  if (!body?.trim()) {
    return NextResponse.json({ error: 'Message body is required.' }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ conversation_id: id, sender_id: user.id, body: body.trim() })
    .select('*')
    .single<Message>()

  if (error || !message) {
    console.error('POST /api/conversations/[id]/messages failed', error)
    return NextResponse.json(
      { error: 'Could not send message.' },
      { status: 500 }
    )
  }

  await supabase
    .from('conversations')
    .update({ last_message_at: message.created_at })
    .eq('id', id)

  // Notification email — best effort, never fails the request. `profiles`
  // RLS only allows reading your own row, so the counterpart's email is
  // looked up with the service-role client. There is no presence/online
  // tracking yet, so a notification is sent on every message.
  const admin = createAdminClient()
  const { data: conversation } = await admin
    .from('conversations')
    .select('planner_id, vendor_id')
    .eq('id', id)
    .maybeSingle()

  if (conversation) {
    const senderIsPlanner = user.id === conversation.planner_id

    const { data: plannerProfile } = conversation.planner_id
      ? await admin
          .from('profiles')
          .select('full_name, email')
          .eq('id', conversation.planner_id)
          .maybeSingle()
      : { data: null }
    const { data: vendor } = conversation.vendor_id
      ? await admin
          .from('vendors')
          .select('business_name, profile_id')
          .eq('id', conversation.vendor_id)
          .maybeSingle()
      : { data: null }

    let recipientEmail: string | null = null
    let recipientName = 'there'
    if (senderIsPlanner) {
      const { data: vendorProfile } = vendor
        ? await admin.from('profiles').select('email').eq('id', vendor.profile_id).maybeSingle()
        : { data: null }
      recipientEmail = vendorProfile?.email ?? null
      recipientName = vendor?.business_name ?? 'there'
    } else {
      recipientEmail = plannerProfile?.email ?? null
      recipientName = plannerProfile?.full_name ?? 'there'
    }
    const senderName = senderIsPlanner
      ? (plannerProfile?.full_name ?? 'A planner')
      : (vendor?.business_name ?? 'A vendor')

    if (recipientEmail) {
      await sendNewMessageEmail({
        to: recipientEmail,
        recipientName,
        recipientRole: senderIsPlanner ? 'vendor' : 'planner',
        senderName,
        messageBody: message.body,
        conversationId: id,
      })
    }
  }

  return NextResponse.json({ message }, { status: 201 })
}
