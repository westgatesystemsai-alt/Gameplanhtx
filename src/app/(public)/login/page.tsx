'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ROLE_HOME: Record<string, string> = {
  planner: '/dashboard',
  vendor: '/vendor/dashboard',
  admin: '/admin/dashboard',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Login failed.')
      setSubmitting(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const roleHome = ROLE_HOME[profile?.role ?? ''] ?? '/'
    const redirect = searchParams.get('redirect')
    // Only honor same-role redirects back to protected pages.
    const destination =
      redirect && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : roleHome

    router.push(destination)
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">Log in</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Welcome back to Game Plan HTX.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          New here?{' '}
          <Link href="/register" className="font-medium underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
