import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConversationThread from '@/components/messaging/ConversationThread'
import QuoteCard from '@/components/messaging/QuoteCard'
import QuoteBuilder from '@/components/messaging/QuoteBuilder'
import type { Message, Quote, Service } from '@/types'

export const dynamic = 'force-dynamic'

// Vendor view of a conversation: live thread plus the QuoteBuilder
// (or the current quote's status once one has been sent).
export default async function VendorConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, business_name')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!vendor) redirect('/apply')

  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, planner:profiles!conversations_planner_id_fkey(id, full_name)')
    .eq('id', id)
    .eq('vendor_id', vendor.id)
    .maybeSingle()
  if (!conversation) notFound()

  const [{ data: messages }, { data: quotes }, { data: services }] =
    await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('quotes')
        .select('*, service:services(title)')
        .eq('conversation_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('services')
        .select('*')
        .eq('vendor_id', vendor.id)
        .eq('is_active', true)
        .order('title'),
    ])

  const quote = (quotes?.[0] ?? null) as (Quote & { service?: { title: string } | null }) | null
  const plannerName = conversation.planner?.full_name ?? 'Planner'
  // Allow sending a fresh quote once the previous one was declined/expired.
  const showBuilder = !quote || quote.status === 'declined' || quote.status === 'expired'

  return (
    <main className="mx-auto grid h-[calc(100vh-4rem)] max-w-4xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[1fr_20rem]">
      <div className="flex min-h-0 flex-col">
        <h1 className="mb-2 text-lg font-bold">{plannerName}</h1>
        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <ConversationThread
            conversationId={id}
            currentUserId={user.id}
            initialMessages={(messages ?? []) as Message[]}
            otherPartyName={plannerName}
          />
        </div>
      </div>

      <aside className="space-y-4 overflow-y-auto">
        {quote && (
          <QuoteCard
            quote={quote}
            viewer="vendor"
            serviceName={quote.service?.title ?? null}
          />
        )}
        {showBuilder && (
          <QuoteBuilder
            conversationId={id}
            services={(services ?? []) as Service[]}
          />
        )}
      </aside>
    </main>
  )
}
