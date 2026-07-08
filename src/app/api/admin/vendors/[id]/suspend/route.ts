import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/require-admin'

// PUT /api/admin/vendors/[id]/suspend — suspends an approved vendor,
// removing them from public search and profile access.
export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const { data: vendor } = await admin
    .from('vendors')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 })
  }
  if (vendor.status === 'suspended') {
    return NextResponse.json({ error: 'Vendor is already suspended.' }, { status: 409 })
  }

  const { data: updated, error } = await admin
    .from('vendors')
    .update({ status: 'suspended' })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !updated) {
    console.error('PUT /api/admin/vendors/[id]/suspend failed', error)
    return NextResponse.json({ error: 'Could not suspend vendor.' }, { status: 500 })
  }

  return NextResponse.json({ vendor: updated })
}
