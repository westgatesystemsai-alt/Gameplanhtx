import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function formatWhen(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Planner inbox: conversations sorted by recency with vendor name,
// last-message preview, and unread badge.
export default async function PlannerMessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, vendor:vendors(id, business_name)')
    .eq('planner_id', user.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  const ids = (conversations ?? []).map((c) => c.id)
  const { data: messages } = ids.length
    ? await supabase
        .from('messages')
        .select('conversation_id, sender_id, body, read_at, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false })
    : { data: [] }

  const rows = (conversations ?? []).map((c) => {
    const msgs = (messages ?? []).filter((m) => m.conversation_id === c.id)
    return {
      ...c,
      preview: msgs[0]?.body ?? 'No messages yet',
      unread: msgs.filter((m) => m.sender_id !== user.id && m.read_at === null)
        .length,
    }
  })

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Your conversations with vendors.
      </p>

      {rows.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center text-gray-500">
          <MessageSquare size={40} className="mb-3 text-gray-300" />
          <p className="font-medium">No conversations yet</p>
          <p className="mt-1 text-sm">
            Find a vendor and send them a message to get started.
          </p>
          <Link
            href="/vendors"
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900"
          >
            Browse vendors
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/messages/${c.id}`}
                className="flex items-center gap-3 p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {(c.vendor?.business_name ?? '?').charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold">
                      {c.vendor?.business_name ?? 'Vendor'}
                    </p>
                    <span className="shrink-0 text-xs text-gray-500">
                      {formatWhen(c.last_message_at)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                    {c.preview}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                    {c.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
