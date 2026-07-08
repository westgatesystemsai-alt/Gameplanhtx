'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types'

const inputClass =
  'rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900'

export default function ApplyPage() {
  const [categories, setCategories] = useState<Category[]>([])

  // Account
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Business
  const [businessName, setBusinessName] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [portfolioUrls, setPortfolioUrls] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (categoryIds.length === 0) {
      setError('Select at least one category.')
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'vendor', full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/login`,
      },
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Could not create account.')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/auth/register/vendor-apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: data.user.id,
        full_name: fullName,
        email,
        business_name: businessName,
        category_ids: categoryIds,
        bio,
        website_url: websiteUrl,
        instagram_url: instagramUrl,
        years_experience: yearsExperience ? Number(yearsExperience) : null,
        portfolio_urls: portfolioUrls
          .split('\n')
          .map((u) => u.trim())
          .filter(Boolean),
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? 'Could not submit application.')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">Application received</h1>
        <p className="mt-2 max-w-md text-gray-600 dark:text-gray-400">
          Thanks for applying! Confirm your email address, and our team will
          review your application. You&apos;ll get an email once you&apos;re
          approved.
        </p>
        <Link href="/" className="mt-6 font-medium underline">
          Back to home
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Become a vendor</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Apply to list your business on Game Plan HTX. We review every
        application to keep quality high.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Your account</legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Full name</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
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
              className={inputClass}
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
              className={inputClass}
              autoComplete="new-password"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Your business</legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Business name</span>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Categories</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    categoryIds.includes(cat.id)
                      ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && (
                <span className="text-sm text-gray-500">
                  Loading categories…
                </span>
              )}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Bio</span>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={inputClass}
              placeholder="Tell planners about your business…"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Website (optional)</span>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={inputClass}
              placeholder="https://"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Instagram (optional)</span>
            <input
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              className={inputClass}
              placeholder="https://instagram.com/…"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Years of experience</span>
            <input
              type="number"
              min={0}
              max={100}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              Portfolio links (one per line)
            </span>
            <textarea
              rows={3}
              value={portfolioUrls}
              onChange={(e) => setPortfolioUrls(e.target.value)}
              className={inputClass}
              placeholder={'https://example.com/gallery\nhttps://…'}
            />
          </label>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
      </form>
    </main>
  )
}
