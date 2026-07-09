import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/require-admin'
import type { VerifiedItems } from '@/types'

interface VerifyBody {
  verified_items?: Partial<VerifiedItems>
}

// PUT /api/admin/vendors/[id]/verify — updates the 4-item Gameplan
// Verified checklist (insurance, license, portfolio, standards).
// verified_items is guarded by the vendors_protect_columns trigger, so
// vendors can never self-verify — only admin/service-role writes land.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  let body: VerifyBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!body.verified_items || typeof body.verified_items !== 'object') {
    return NextResponse.json({ error: 'verified_items is required.' }, { status: 400 })
  }

  const verified_items: VerifiedItems = {
    insurance: Boolean(body.verified_items.insurance),
    license: Boolean(body.verified_items.license),
    portfolio: Boolean(body.verified_items.portfolio),
    standards: Boolean(body.verified_items.standards),
  }

  const admin = createAdminClient()
  const { data: vendor, error } = await admin
    .from('vendors')
    .update({ verified_items })
    .eq('id', id)
    .select('id, verified_items')
    .single()

  if (error || !vendor) {
    console.error('PUT /api/admin/vendors/[id]/verify failed', error)
    return NextResponse.json({ error: 'Could not update verification.' }, { status: 500 })
  }

  return NextResponse.json({ vendor })
}
