import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VendorProfileForm from './vendor-profile-form'

export const dynamic = 'force-dynamic'

export default async function VendorProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendor } = await supabase
    .from('vendors')
    .select(
      'id, business_name, bio, city, zip_code, website_url, instagram_url, price_range_min'
    )
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!vendor) redirect('/apply')

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Edit business profile</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Keep your business details and pricing up to date for planners.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <VendorProfileForm vendor={vendor} />
      </div>
    </main>
  )
}
