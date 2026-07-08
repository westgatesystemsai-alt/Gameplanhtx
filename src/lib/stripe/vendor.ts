import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Vendor } from '@/types'

export type VendorAuthResult =
  | { vendor: Vendor; error: null }
  | { vendor: null; error: { message: string; status: number } }

// Resolves the current session user to their vendor row. RLS lets a
// vendor read their own row, so the cookie-scoped client is enough here.
export async function getAuthenticatedVendor(): Promise<VendorAuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { vendor: null, error: { message: 'Not authenticated.', status: 401 } }
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!vendor) {
    return {
      vendor: null,
      error: { message: 'No vendor account for this user.', status: 403 },
    }
  }

  return { vendor: vendor as Vendor, error: null }
}
