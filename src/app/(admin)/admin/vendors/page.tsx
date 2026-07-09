import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'
import VendorsTable, { type VendorRow } from './vendors-table'

export const dynamic = 'force-dynamic'

// All approved vendors, searchable by business name, with a Suspend
// action per row.
export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('vendors')
    .select(
      'id, business_name, slug, tier, avg_rating, verified_items, profile:profiles!vendors_profile_id_fkey(full_name, email)'
    )
    .eq('status', 'approved')
    .order('business_name')

  if (q?.trim()) {
    query = query.ilike('business_name', `%${q.trim()}%`)
  }

  const { data: vendors } = await query.returns<VendorRow[]>()

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Vendors</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        All approved vendors on the platform.
      </p>

      <div className="mt-6">
        <AdminNav active="/admin/vendors" />
      </div>

      <Suspense>
        <VendorsTable vendors={vendors ?? []} initialQuery={q ?? ''} />
      </Suspense>
    </main>
  )
}
