import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase email confirmation / OAuth callback: exchanges the auth code
// for a session, then redirects to `next` (or a sensible default).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/'
  // Only allow same-origin relative redirects.
  const next =
    nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=Could+not+confirm+your+email.+Please+try+again.`
  )
}
