'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

const inputClass =
  'rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900'

interface VendorProfileFormProps {
  vendor: {
    id: string
    business_name: string
    bio: string | null
    city: string
    zip_code: string | null
    website_url: string | null
    instagram_url: string | null
    price_range_min: number | null
  }
}

export default function VendorProfileForm({ vendor }: VendorProfileFormProps) {
  const router = useRouter()

  const [businessName, setBusinessName] = useState(vendor.business_name)
  const [bio, setBio] = useState(vendor.bio ?? '')
  const [city, setCity] = useState(vendor.city)
  const [zipCode, setZipCode] = useState(vendor.zip_code ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(vendor.website_url ?? '')
  const [instagramUrl, setInstagramUrl] = useState(vendor.instagram_url ?? '')
  const [startingPrice, setStartingPrice] = useState(
    vendor.price_range_min != null ? String(vendor.price_range_min) : ''
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          bio,
          city,
          zip_code: zipCode,
          website_url: websiteUrl,
          instagram_url: instagramUrl,
          price_range_min: startingPrice ? Number(startingPrice) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save profile.')
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">City</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Zip code</span>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

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

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <p className="font-outfit text-sm font-semibold">Transparent Pricing</p>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Shown as &quot;From $…&quot; on your search card so planners know what to expect.
        </p>
        <label className="mt-3 flex flex-col gap-1">
          <span className="text-sm font-medium">Starting price</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="number"
              min={0}
              step={1}
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              className={`${inputClass} w-40`}
              placeholder="e.g. 500"
            />
          </div>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-verified">Profile saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-md bg-action px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
