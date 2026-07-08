import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'
import ApplicationActions from './application-actions'

export const dynamic = 'force-dynamic'

// Full vendor application detail with Approve/Reject actions while
// pending, or the recorded decision once reviewed.
export default async function AdminApplicationDetailPage({
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

  const { data: application } = await supabase
    .from('vendor_applications')
    .select('*, profile:profiles!vendor_applications_profile_id_fkey(full_name, email, phone)')
    .eq('id', id)
    .maybeSingle()
  if (!application) notFound()

  const categoryIds = application.category_ids ?? []
  const { data: categories } = categoryIds.length
    ? await supabase.from('categories').select('id, name').in('id', categoryIds)
    : { data: [] }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/admin/applications"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:underline dark:text-gray-400"
      >
        <ArrowLeft size={15} /> Back to applications
      </Link>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Application
            </p>
            <h1 className="mt-1 text-2xl font-bold">{application.business_name}</h1>
          </div>
          <StatusBadge status={application.status} />
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Applicant</dt>
            <dd className="mt-0.5 font-medium">{application.profile?.full_name ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="mt-0.5 font-medium">{application.profile?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Phone</dt>
            <dd className="mt-0.5 font-medium">{application.profile?.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Years of experience</dt>
            <dd className="mt-0.5 font-medium">{application.years_experience ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Website</dt>
            <dd className="mt-0.5 font-medium">
              {application.website_url ? (
                <a
                  href={application.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-blue-600 hover:underline"
                >
                  {application.website_url}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Instagram</dt>
            <dd className="mt-0.5 font-medium">
              {application.instagram_url ? (
                <a
                  href={application.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-blue-600 hover:underline"
                >
                  {application.instagram_url}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Submitted</dt>
            <dd className="mt-0.5 font-medium">
              {new Date(application.created_at).toLocaleDateString('en-US', {
                dateStyle: 'long',
              })}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Categories</dt>
            <dd className="mt-0.5 font-medium">
              {categories?.length ? categories.map((c) => c.name).join(', ') : '—'}
            </dd>
          </div>
        </dl>

        {application.bio && (
          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="text-sm text-gray-500">Bio</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{application.bio}</p>
          </div>
        )}

        {application.portfolio_urls?.length ? (
          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="text-sm text-gray-500">Portfolio links</p>
            <ul className="mt-1 space-y-1">
              {application.portfolio_urls.map((url: string) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-blue-600 hover:underline"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {application.status === 'pending' ? (
          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
            <ApplicationActions applicationId={application.id} />
          </div>
        ) : (
          <div className="mt-6 border-t border-gray-100 pt-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400">
            <p>
              Reviewed{' '}
              {application.reviewed_at
                ? new Date(application.reviewed_at).toLocaleDateString('en-US', {
                    dateStyle: 'long',
                  })
                : ''}
            </p>
            {application.admin_notes && <p className="mt-1">Notes: {application.admin_notes}</p>}
          </div>
        )}
      </div>
    </main>
  )
}
