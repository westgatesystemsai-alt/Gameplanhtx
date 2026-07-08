'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, CheckCheck, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types'

interface ConversationThreadProps {
  conversationId: string
  currentUserId: string
  initialMessages: Message[]
  otherPartyName: string
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ConversationThread({
  conversationId,
  currentUserId,
  initialMessages,
  otherPartyName,
}: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Realtime: append messages inserted by the other party (RLS scopes
  // the subscription to conversations this user participates in).
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Mark inbound messages read on open and whenever new ones arrive.
  useEffect(() => {
    const hasUnread = messages.some(
      (m) => m.sender_id !== currentUserId && m.read_at === null
    )
    if (hasUnread) {
      fetch(`/api/conversations/${conversationId}/read`, { method: 'PUT' }).catch(
        () => {}
      )
    }
  }, [messages, conversationId, currentUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not send message.')
      setMessages((prev) =>
        prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
      )
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            No messages yet. Say hello to {otherPartyName}!
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? 'rounded-br-sm bg-blue-600 text-white'
                    : 'rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div
                  className={`mt-1 flex items-center gap-1 text-[11px] ${
                    mine ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  <span>{formatTime(m.created_at)}</span>
                  {mine &&
                    (m.read_at ? (
                      <CheckCheck size={13} aria-label="Read" />
                    ) : (
                      <Check size={13} aria-label="Sent" />
                    ))}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="flex items-end gap-2 border-t border-gray-200 p-3 dark:border-gray-800"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder={`Message ${otherPartyName}…`}
          className="max-h-32 flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={15} />
          Send
        </button>
      </form>
    </div>
  )
}
