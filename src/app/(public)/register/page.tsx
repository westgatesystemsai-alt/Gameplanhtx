'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'planner', full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setSubmitting(false)
      return
    }

    if (data.user) {
      const res = await fetch('/api/auth/register/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: data.user.id,
          full_name: fullName,
          email,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Could not complete registration.')
        setSubmitting(false)
        return
      }
    }

    // No session means email confirmation is required.
    if (!data.session) {
      setConfirmationSent(true)
      setSubmitting(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (confirmationSent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-2 max-w-md text-gray-600 dark:text-gray-400">
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your account, then log in.
        </p>
        <Link href="/login" className="mt-6 font-medium underline">
          Go to login
        </Link>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Plan your next event with Houston&apos;s best vendors.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Full name</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              autoComplete="name"
            />
          </label>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              autoComplete="new-password"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Are you a vendor?{' '}
          <Link href="/apply" className="font-medium underline">
            Apply here
          </Link>
        </p>
      </div>
    </main>
  )
}
