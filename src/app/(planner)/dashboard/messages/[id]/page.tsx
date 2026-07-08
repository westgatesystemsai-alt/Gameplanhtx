import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ConversationThread from '@/components/messaging/ConversationThread'
import QuoteCard from '@/components/messaging/QuoteCard'
import type { Message, Quote } from '@/types'

export const dynamic = 'force-dynamic'

// Planner view of a conversation: live thread + current quote with
// Accept/Decline and, on accept, the Stripe payment UI.
export default async function PlannerConversationPage({
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

  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, vendor:vendors(id, business_name)')
    .eq('id', id)
    .eq('planner_id', user.id)
    .maybeSingle()
  if (!conversation) notFound()

  const [{ data: messages }, { data: quotes }] = await Promise.all([
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
  ])
  const quote = (quotes?.[0] ?? null) as (Quote & { service?: { title: string } | null }) | null
  const vendorName = conversation.vendor?.business_name ?? 'Vendor'

  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-4">
      <div className="mb-2 flex items-center gap-3">
        <Link
          href="/dashboard/messages"
          className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Back to messages"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold">{vendorName}</h1>
      </div>

      {quote && (
        <div className="mb-3">
          <QuoteCard
            quote={quote}
            viewer="planner"
            serviceName={quote.service?.title ?? null}
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <ConversationThread
          conversationId={id}
          currentUserId={user.id}
          initialMessages={(messages ?? []) as Message[]}
          otherPartyName={vendorName}
        />
      </div>
    </main>
  )
}
