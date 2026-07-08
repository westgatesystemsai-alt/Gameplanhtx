'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Approve/Reject buttons plus an optional notes field, shared with the
// applicant on rejection and stored internally either way.
export default function ApplicationActions({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function act(action: 'approve' | 'reject') {
    if (action === 'reject' && !window.confirm('Reject this application?')) return
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Could not ${action} application.`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} application.`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes, or a reason to share with the applicant…"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => act('approve')}
          disabled={busy !== null}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {busy === 'approve' ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={() => act('reject')}
          disabled={busy !== null}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          {busy === 'reject' ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
