import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'

export const dynamic = 'force-dynamic'

// Queue of pending vendor applications awaiting admin review.
export default async function AdminApplicationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: applications }, { data: categories }] = await Promise.all([
    supabase
      .from('vendor_applications')
      .select('*, profile:profiles!vendor_applications_profile_id_fkey(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase.from('categories').select('id, name'),
  ])

  const categoryNames = new Map((categories ?? []).map((c) => [c.id, c.name]))

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Vendor applications</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Pending applications awaiting review.
      </p>

      <div className="mt-6">
        <AdminNav active="/admin/applications" />
      </div>

      {!applications?.length ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700">
          No pending applications.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Categories</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {applications.map((app) => (
                <tr key={app.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{app.profile?.full_name ?? 'Unknown'}</p>
                    <p className="text-gray-500">{app.profile?.email}</p>
                  </td>
                  <td className="px-4 py-3">{app.business_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {(app.category_ids ?? [])
                      .map((id: string) => categoryNames.get(id) ?? id)
                      .join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {new Date(app.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
