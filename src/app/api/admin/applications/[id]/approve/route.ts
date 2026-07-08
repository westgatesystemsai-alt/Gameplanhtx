import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { sendVendorApprovedEmail } from '@/lib/resend/emails'
import { slugify } from '@/lib/utils/slugify'

interface ApproveBody {
  notes?: string
}

// PUT /api/admin/applications/[id]/approve — creates the vendors record
// (+ category links) from a pending application, marks it reviewed, and
// emails the applicant. Vendor rows have no client INSERT policy, so
// this runs entirely on the service-role client once admin is confirmed.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { user } = auth

  let body: ApproveBody = {}
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
    console.error('PUT /api/admin/applications/[id]/approve: fetch failed', fetchError)
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
  if (!application.profile_id) {
    return NextResponse.json(
      { error: 'Application has no applicant profile.' },
      { status: 409 }
    )
  }

  const baseSlug = slugify(application.business_name) || 'vendor'
  let vendor: { id: string; business_name: string; slug: string } | null = null
  let slug = baseSlug
  for (let attempt = 0; attempt < 5 && !vendor; attempt++) {
    const { data, error } = await admin
      .from('vendors')
      .insert({
        profile_id: application.profile_id,
        business_name: application.business_name,
        slug,
        bio: application.bio,
        website_url: application.website_url,
        instagram_url: application.instagram_url,
        status: 'approved',
      })
      .select('id, business_name, slug')
      .single()

    if (data) {
      vendor = data
    } else if (error?.code === '23505') {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`
    } else {
      console.error('PUT /api/admin/applications/[id]/approve failed', error)
      return NextResponse.json({ error: 'Could not create vendor record.' }, { status: 500 })
    }
  }
  if (!vendor) {
    return NextResponse.json(
      { error: 'Could not generate a unique vendor slug.' },
      { status: 500 }
    )
  }

  if (application.category_ids?.length) {
    await admin.from('vendor_categories').insert(
      application.category_ids.map((category_id: string) => ({
        vendor_id: vendor!.id,
        category_id,
      }))
    )
  }

  const { data: updatedApplication, error: updateError } = await admin
    .from('vendor_applications')
    .update({
      status: 'approved',
      admin_notes: body.notes?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (updateError || !updatedApplication) {
    console.error('PUT /api/admin/applications/[id]/approve failed', updateError)
    return NextResponse.json(
      { error: 'Vendor created, but could not update the application.' },
      { status: 500 }
    )
  }

  if (application.profile?.email) {
    await sendVendorApprovedEmail({
      to: application.profile.email,
      businessName: application.business_name,
    })
  }

  return NextResponse.json({ vendor, application: updatedApplication })
}
