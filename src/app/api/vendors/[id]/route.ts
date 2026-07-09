import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VendorUpdateBody {
  business_name?: string
  bio?: string
  city?: string
  zip_code?: string
  website_url?: string
  instagram_url?: string
  price_range_min?: number | null
}

// PUT /api/vendors/[id] — vendor updates their own profile, including
// their Transparent Pricing "starting price". RLS ("vendors: owner
// update") scopes this to the authenticated owner or an admin;
// price_range_min/max are not in the protect-columns trigger's guard
// list, so a plain authenticated update is sufficient here.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let body: VendorUpdateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (body.price_range_min != null && (!Number.isFinite(body.price_range_min) || body.price_range_min < 0)) {
    return NextResponse.json({ error: 'Starting price must be a positive number.' }, { status: 400 })
  }

  const { data: vendor, error } = await supabase
    .from('vendors')
    .update({
      business_name: body.business_name?.trim(),
      bio: body.bio?.trim() || null,
      city: body.city?.trim() || 'Houston',
      zip_code: body.zip_code?.trim() || null,
      website_url: body.website_url?.trim() || null,
      instagram_url: body.instagram_url?.trim() || null,
      price_range_min: body.price_range_min ?? null,
    })
    .eq('id', id)
    .eq('profile_id', user.id)
    .select('*')
    .single()

  if (error || !vendor) {
    console.error(`PUT /api/vendors/${id} failed`, error)
    return NextResponse.json({ error: 'Could not save profile.' }, { status: 500 })
  }

  return NextResponse.json({ vendor })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select(
        '*, services(*), portfolio_media(*), vendor_categories(categories(*))'
      )
      .eq('id', id)
      .eq('status', 'approved')
      .maybeSingle()

    if (error) throw error
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, rating, body, created_at, planner_id')
      .eq('vendor_id', id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      ...vendor,
      categories: (vendor.vendor_categories ?? [])
        .map((vc: { categories: unknown }) => vc.categories)
        .filter(Boolean),
      vendor_categories: undefined,
      recent_reviews: reviews ?? [],
      avg_rating: vendor.avg_rating,
    })
  } catch (error) {
    console.error(`GET /api/vendors/${id} failed`, error)
    return NextResponse.json({ error: 'Failed to load vendor' }, { status: 500 })
  }
}
