import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Event Vendor Categories | Game Plan HTX',
  description:
    'Browse every category of Houston event vendor — photography, catering, DJs, venues, and more.',
}

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Browse by Category</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-400">
        Every kind of event vendor Houston has to offer.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {((categories ?? []) as Category[]).map((c) => (
          <Link
            key={c.id}
            href={`/categories/${c.slug}`}
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <span className="text-3xl" aria-hidden>
              {c.icon ?? '🎉'}
            </span>
            <h2 className="font-semibold">{c.name}</h2>
            {c.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{c.description}</p>
            )}
          </Link>
        ))}
      </div>
    </main>
  )
}
