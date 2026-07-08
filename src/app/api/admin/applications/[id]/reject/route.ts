import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { sendVendorRejectedEmail } from '@/lib/resend/emails'

interface RejectBody {
  notes?: string
}

// PUT /api/admin/applications/[id]/reject — rejects a pending vendor
// application and emails the applicant.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { user } = auth

  let body: RejectBody = {}
  try {
    body = await request.json()
  } catch {
    // no body is fine — notes are optional
  }

  const admin = createAdminClient()
  const { data: application, error: fetchError } = await admin
    .from('vendor_applications')
    .select('*, profile:profiles!vendor_applications_profile_id_fkey(email)')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('PUT /api/admin/applications/[id]/reject: fetch failed', fetchError)
    return NextResponse.json({ error: 'Could not load application.' }, { status: 500 })
  }
  if (!application) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
  }
  if (application.status !== 'pending') {
    return NextResponse.json(
      { error: `Application is already ${application.status}.` },
      { status: 409 }
    )
  }

  const notes = body.notes?.trim() || null

  const { data: updated, error } = await admin
    .from('vendor_applications')
    .update({
      status: 'rejected',
      admin_notes: notes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !updated) {
    console.error('PUT /api/admin/applications/[id]/reject failed', error)
    return NextResponse.json({ error: 'Could not reject application.' }, { status: 500 })
  }

  if (application.profile?.email) {
    await sendVendorRejectedEmail({
      to: application.profile.email,
      businessName: application.business_name,
      notes,
    })
  }

  return NextResponse.json({ application: updated })
}
