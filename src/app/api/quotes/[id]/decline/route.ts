import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Quote } from '@/types'

// PUT /api/quotes/[id]/decline — planner declines a quote.
export async function PUT(
  _request: Request,
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

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .maybeSingle<Quote>()

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
  }
  if (quote.planner_id !== user.id) {
    return NextResponse.json(
      { error: 'Only the planner can decline this quote.' },
      { status: 403 }
    )
  }
  if (quote.status !== 'pending') {
    return NextResponse.json(
      { error: `Quote is already ${quote.status}.` },
      { status: 409 }
    )
  }

  const { data: updated, error } = await supabase
    .from('quotes')
    .update({ status: 'declined' })
    .eq('id', id)
    .select('*')
    .single<Quote>()

  if (error || !updated) {
    console.error('PUT /api/quotes/[id]/decline failed', error)
    return NextResponse.json(
      { error: 'Could not decline quote.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ quote: updated })
}
