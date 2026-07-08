import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewApplicationAdminAlert } from '@/lib/resend/emails'

// No admin-email config or admin-settings table exists yet; hardcode for
// now and move to an env var / admin settings table once one exists.
const ADMIN_EMAIL = 'westong03@gmail.com'

interface VendorApplyBody {
  user_id?: string
  full_name?: string
  email?: string
  business_name?: string
  category_ids?: string[]
  bio?: string
  website_url?: string
  instagram_url?: string
  years_experience?: number
  portfolio_urls?: string[]
}

// Ensures a vendor profile exists after signUp and creates the
// vendor_application record. Never changes the role of an existing profile.
export async function POST(request: Request) {
  let body: VendorApplyBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { user_id, business_name } = body
  if (!user_id || !business_name?.trim()) {
    return NextResponse.json(
      { error: 'user_id and business_name are required.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(user_id)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Unknown user.' }, { status: 404 })
  }

  // Ensure profile exists (DB trigger normally handles this).
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', user_id)
    .maybeSingle()

  if (!existing) {
    const { error: insertError } = await admin.from('profiles').insert({
      id: user_id,
      role: 'vendor',
      full_name: body.full_name ?? null,
      email: body.email ?? userData.user.email ?? null,
    })
    if (insertError) {
      return NextResponse.json(
        { error: 'Could not create profile.' },
        { status: 500 }
      )
    }
  }

  // One pending application per profile.
  const { data: pending } = await admin
    .from('vendor_applications')
    .select('id')
    .eq('profile_id', user_id)
    .eq('status', 'pending')
    .maybeSingle()

  if (pending) {
    return NextResponse.json(
      { error: 'You already have a pending application.' },
      { status: 409 }
    )
  }

  const { data: application, error: appError } = await admin
    .from('vendor_applications')
    .insert({
      profile_id: user_id,
      business_name: business_name.trim(),
      category_ids: body.category_ids ?? null,
      bio: body.bio || null,
      website_url: body.website_url || null,
      instagram_url: body.instagram_url || null,
      years_experience: body.years_experience ?? null,
      portfolio_urls: body.portfolio_urls?.filter(Boolean) ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (appError || !application) {
    return NextResponse.json(
      { error: 'Could not submit application.' },
      { status: 500 }
    )
  }

  await sendNewApplicationAdminAlert({
    to: ADMIN_EMAIL,
    applicationId: application.id,
    businessName: business_name.trim(),
    applicantEmail: body.email ?? userData.user.email ?? 'unknown',
    yearsExperience: body.years_experience ?? null,
  })

  return NextResponse.json({ ok: true })
}
