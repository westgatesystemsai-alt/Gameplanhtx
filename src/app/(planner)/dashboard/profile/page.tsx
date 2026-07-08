import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/planner/ProfileForm'
import type { Profile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PlannerProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>()
  if (!profile) redirect('/login')

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Manage your account details.
      </p>

      <div className="mt-6">
        <ProfileForm profile={profile} />
      </div>
    </main>
  )
}
