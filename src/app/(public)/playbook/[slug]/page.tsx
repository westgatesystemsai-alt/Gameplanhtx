import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { createClient } from '@/lib/supabase/server'
import { searchVendors } from '@/lib/vendors/search'
import VendorCard from '@/components/vendor/VendorCard'
import { playbookMdxComponents } from '@/components/playbook/mdxComponents'
import { getGuide } from '@/lib/playbook/content'

export const dynamic = 'force-dynamic'

const SITE_URL = 'https://gameplanhtx.com'

interface GuidePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) return { title: 'Guide Not Found | Game Plan HTX' }
  const url = `${SITE_URL}/playbook/${guide.slug}`
  return {
    title: `${guide.title} | Game Plan HTX`,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url,
      type: 'article',
      publishedTime: guide.publishedAt,
    },
  }
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

export default async function PlaybookGuidePage({ params }: GuidePageProps) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) notFound()

  // Pull up to 3 live, ranked vendors from the guide's category.
  const supabase = await createClient()
  const { vendors } = await searchVendors(supabase, { category: guide.category, per_page: 3 })
  const featuredVendors = vendors.slice(0, 3)

  const url = `${SITE_URL}/playbook/${guide.slug}`

  // AEO layer: Article schema for the guide, FAQPage schema for the accordion.
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    datePublished: guide.publishedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    publisher: {
      '@type': 'Organization',
      name: 'Game Plan HTX',
      url: SITE_URL,
    },
  }

  const faqSchema =
    guide.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: guide.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }
      : null

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link href="/playbook" className="font-medium text-action hover:underline">
          ← The Playbook
        </Link>
      </nav>

      {/* Header */}
      <header className="border-b border-gray-200 pb-8 dark:border-gray-800">
        <h1 className="font-outfit text-3xl font-bold tracking-tight text-ink sm:text-4xl dark:text-white">
          {guide.title}
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">{guide.description}</p>
        <time
          className="mt-4 block text-sm text-gray-500 dark:text-gray-400"
          dateTime={guide.publishedAt}
        >
          Published {formatDate(guide.publishedAt)}
        </time>
      </header>

      {/* MDX content */}
      <article className="mt-8">
        <MDXRemote source={guide.content} components={playbookMdxComponents} />
      </article>

      {/* Featured Vendors */}
      {featuredVendors.length > 0 && (
        <section className="mt-14 border-t border-gray-200 pt-10 dark:border-gray-800">
          <h2 className="font-outfit mb-2 text-2xl font-bold tracking-tight text-ink dark:text-white">
            Featured Vendors
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Vetted Houston vendors ready to help with your event.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredVendors.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </section>
      )}

      {/* FAQ accordion — native details/summary, no JS, fully crawlable */}
      {guide.faqs.length > 0 && (
        <section className="mt-14 border-t border-gray-200 pt-10 dark:border-gray-800">
          <h2 className="font-outfit mb-6 text-2xl font-bold tracking-tight text-ink dark:text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {guide.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <summary className="font-outfit flex cursor-pointer items-center justify-between gap-3 font-semibold text-ink marker:content-[''] dark:text-white">
                  {faq.question}
                  <span className="text-action transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
