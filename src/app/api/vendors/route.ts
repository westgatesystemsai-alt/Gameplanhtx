import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchVendors } from '@/lib/vendors/search'

function num(value: string | null): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  try {
    const supabase = await createClient()
    const result = await searchVendors(supabase, {
      category: params.get('category') ?? undefined,
      event_date: params.get('event_date') ?? undefined,
      budget_min: num(params.get('budget_min')),
      budget_max: num(params.get('budget_max')),
      guests: num(params.get('guests')),
      zip: params.get('zip') ?? undefined,
      page: num(params.get('page')),
      per_page: num(params.get('per_page')),
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/vendors failed', error)
    return NextResponse.json({ error: 'Vendor search failed' }, { status: 500 })
  }
}
