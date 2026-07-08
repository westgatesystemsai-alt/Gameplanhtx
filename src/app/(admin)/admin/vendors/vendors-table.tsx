'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'
import StatusBadge from '@/components/ui/StatusBadge'

export interface VendorRow {
  id: string
  business_name: string
  slug: string
  tier: string
  avg_rating: number
  profile: { full_name: string | null; email: string | null } | null
}

// Search box + table of approved vendors, with a per-row Suspend
// action. Search re-queries the server via the `q` URL param; suspend
// is optimistic-on-success (row flips to "suspended" without a refetch).
export default function VendorsTable({
  vendors,
  initialQuery,
}: {
  vendors: VendorRow[]
  initialQuery: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQuery)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suspendedIds, setSuspendedIds] = useState<Set<string>>(new Set())

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (q.trim()) params.set('q', q.trim())
    else params.delete('q')
    router.push(`/admin/vendors?${params.toString()}`)
  }

  async function suspend(id: string) {
    if (!window.confirm('Suspend this vendor? Their profile will be hidden from search.')) return
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/vendors/${id}/suspend`, { method: 'PUT' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not suspend vendor.')
      setSuspendedIds((prev) => new Set(prev).add(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not suspend vendor.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search vendors by name…"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900"
        >
          Search
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!vendors.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700">
          No vendors found.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/vendors/${v.slug}`}
                      target="_blank"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {v.business_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p>{v.profile?.full_name ?? '—'}</p>
                    <p className="text-gray-500">{v.profile?.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{v.tier}</td>
                  <td className="px-4 py-3">{Number(v.avg_rating).toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={suspendedIds.has(v.id) ? 'suspended' : 'approved'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!suspendedIds.has(v.id) && (
                      <button
                        onClick={() => suspend(v.id)}
                        disabled={busyId === v.id}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        {busyId === v.id ? 'Suspending…' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
