import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getGuidesByCategory, type PlaybookGuideMeta } from '@/lib/playbook/content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The Playbook — Houston Event Planning Guides | Game Plan HTX',
  description:
    'Event planning guides for Houston. Expert, local advice on wedding venues, corporate events, DJs, catering, and building the right vendor team.',
}

function humanize(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatDate(date: string): string {
  const d = new Date(date)
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : date
}

export default async function PlaybookIndexPage() {
  const grouped = getGuidesByCategory()

  // Resolve friendly category names from the vendor category table so section
  // headings match the rest of the site; humanize the slug as a fallback.
  const categoryNames = new Map<string, string>()
  const slugs = [...grouped.keys()]
  if (slugs.length > 0) {
    const supabase = await createClient()
    const { data } = await supabase.from('categories').select('name, slug').in('slug', slugs)
    for (const c of data ?? []) categoryNames.set(c.slug, c.name)
  }

  const sections = [...grouped.entries()]
  const totalGuides = sections.reduce((n, [, guides]) => n + guides.length, 0)

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* Hero */}
      <header className="border-b border-gray-200 pb-10 dark:border-gray-800">
        <p className="font-outfit text-sm font-semibold uppercase tracking-widest text-action">
          The Playbook
        </p>
        <h1 className="font-outfit mt-2 text-4xl font-bold tracking-tight text-ink sm:text-5xl dark:text-white">
          Event planning guides for Houston
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          Local, expert advice on venues, catering, entertainment, and building the vendor team
          that makes your Houston event run itself.
        </p>
      </header>

      {totalGuides === 0 ? (
        <p className="mt-10 text-gray-600 dark:text-gray-400">
          No guides published yet. Check back soon.
        </p>
      ) : (
        <div className="mt-10 space-y-12">
          {sections.map(([category, guides]) => (
            <section key={category}>
              <h2 className="font-outfit mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {categoryNames.get(category) ?? humanize(category)}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {guides.map((guide) => (
                  <GuideCard key={guide.slug} guide={guide} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

function GuideCard({ guide }: { guide: PlaybookGuideMeta }) {
  return (
    <Link
      href={`/playbook/${guide.slug}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-action/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex items-center gap-2">
        {guide.featured && (
          <span className="rounded-full bg-action/10 px-2.5 py-0.5 text-xs font-semibold text-action">
            Featured
          </span>
        )}
        <time className="text-xs text-gray-500 dark:text-gray-400" dateTime={guide.publishedAt}>
          {formatDate(guide.publishedAt)}
        </time>
      </div>
      <h3 className="font-outfit mt-3 text-lg font-semibold leading-snug text-ink transition group-hover:text-action dark:text-white">
        {guide.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {guide.description}
      </p>
      <span className="mt-4 text-sm font-medium text-action">Read guide →</span>
    </Link>
  )
}
