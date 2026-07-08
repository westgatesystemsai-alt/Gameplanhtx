import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
