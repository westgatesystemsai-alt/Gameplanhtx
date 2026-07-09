// compute-vendor-response-rate
//
// Runs hourly (see 006_vendor_response_rate.sql pg_cron schedule).
// For every conversation where a planner sent an inquiry in the last
// 90 days, finds the planner's first message and the vendor's first
// reply after it, averages the reply time (in hours) per vendor, and
// writes it to vendors.response_rate. Vendors with no reply data in
// the window are left untouched (response_rate stays null).
//
// Conversations are unique per (planner_id, vendor_id) and every
// message's sender_id is one of those two profiles, so any message
// not sent by planner_id is treated as the vendor's reply.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const cutoff = new Date(Date.now() - NINETY_DAYS_MS).toISOString()

    // Conversations whose first message (the inquiry) landed in the window.
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, planner_id, vendor_id')
      .not('planner_id', 'is', null)
      .not('vendor_id', 'is', null)
      .gte('created_at', cutoff)

    if (convError) throw convError
    if (!conversations || conversations.length === 0) {
      return Response.json({ updated: 0 })
    }

    const conversationIds = conversations.map((c) => c.id)
    const plannerByConversation = new Map(conversations.map((c) => [c.id, c.planner_id]))
    const vendorByConversation = new Map(conversations.map((c) => [c.id, c.vendor_id]))

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true })

    if (msgError) throw msgError

    const firstInquiryAt = new Map<string, string>()
    const firstReplyAt = new Map<string, string>()

    for (const m of messages ?? []) {
      const plannerId = plannerByConversation.get(m.conversation_id)
      if (!plannerId || !m.sender_id) continue

      if (m.sender_id === plannerId) {
        if (!firstInquiryAt.has(m.conversation_id)) {
          firstInquiryAt.set(m.conversation_id, m.created_at)
        }
      } else if (
        firstInquiryAt.has(m.conversation_id) &&
        !firstReplyAt.has(m.conversation_id)
      ) {
        firstReplyAt.set(m.conversation_id, m.created_at)
      }
    }

    const hoursByVendor = new Map<string, number[]>()
    for (const convId of conversationIds) {
      const inquiryAt = firstInquiryAt.get(convId)
      const replyAt = firstReplyAt.get(convId)
      if (!inquiryAt || !replyAt) continue // no reply yet — excluded, not zeroed

      const hours = (new Date(replyAt).getTime() - new Date(inquiryAt).getTime()) / 3_600_000
      const vendorId = vendorByConversation.get(convId)!
      const list = hoursByVendor.get(vendorId) ?? []
      list.push(hours)
      hoursByVendor.set(vendorId, list)
    }

    let updated = 0
    for (const [vendorId, hours] of hoursByVendor) {
      const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ response_rate: Math.round(avg * 100) / 100 })
        .eq('id', vendorId)

      if (updateError) {
        console.error(`compute-vendor-response-rate: failed to update vendor ${vendorId}`, updateError)
        continue
      }
      updated++
    }

    return Response.json({ updated })
  } catch (err) {
    console.error('compute-vendor-response-rate failed', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
})
