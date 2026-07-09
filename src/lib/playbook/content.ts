import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

// The Playbook is Game Plan HTX's editorial hub — MDX guides authored for AI
// answer engines (AEO) and organic search. Content is filesystem-sourced from
// src/content/playbook; no database schema is involved.

export const PLAYBOOK_DIR = path.join(process.cwd(), 'src', 'content', 'playbook')

export interface PlaybookFaq {
  question: string
  answer: string
}

export interface PlaybookFrontmatter {
  title: string
  description: string
  // Maps to a vendor category slug (see supabase/seed.sql), used to pull live
  // Featured Vendors onto the guide page.
  category: string
  publishedAt: string // YYYY-MM-DD
  featured: boolean
  faqs: PlaybookFaq[]
}

export interface PlaybookGuideMeta extends PlaybookFrontmatter {
  slug: string
}

export interface PlaybookGuide extends PlaybookGuideMeta {
  content: string // raw MDX body, frontmatter stripped
}

// YAML auto-parses bare `2026-06-03` into a JS Date. Normalize both Date and
// string forms to a stable YYYY-MM-DD so schema.org dates, <time> attributes,
// and lexicographic sorting all stay correct.
function toISODate(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  return String(value ?? '')
}

function parseFrontmatter(slug: string, raw: string): PlaybookGuide {
  const { data, content } = matter(raw)
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ''),
    category: String(data.category ?? ''),
    publishedAt: toISODate(data.publishedAt),
    featured: Boolean(data.featured),
    faqs: Array.isArray(data.faqs)
      ? data.faqs
          .filter((f): f is PlaybookFaq => Boolean(f?.question && f?.answer))
          .map((f) => ({ question: String(f.question), answer: String(f.answer) }))
      : [],
    content,
  }
}

function isPublished(g: { publishedAt: string }): boolean {
  if (!g.publishedAt) return false
  const published = new Date(g.publishedAt).getTime()
  return Number.isFinite(published) && published <= Date.now()
}

// All published guides, newest first. Reads every .mdx file in the content
// directory and strips the body for lighter listing payloads.
export function getAllGuides(): PlaybookGuideMeta[] {
  let files: string[]
  try {
    files = fs.readdirSync(PLAYBOOK_DIR)
  } catch {
    return []
  }

  return files
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const slug = f.replace(/\.mdx$/, '')
      const raw = fs.readFileSync(path.join(PLAYBOOK_DIR, f), 'utf8')
      const { content: _content, ...meta } = parseFrontmatter(slug, raw)
      void _content
      return meta
    })
    .filter(isPublished)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

// Guides grouped by their vendor category slug, preserving newest-first order
// within each group.
export function getGuidesByCategory(): Map<string, PlaybookGuideMeta[]> {
  const grouped = new Map<string, PlaybookGuideMeta[]>()
  for (const guide of getAllGuides()) {
    const list = grouped.get(guide.category) ?? []
    list.push(guide)
    grouped.set(guide.category, list)
  }
  return grouped
}

// Full guide (including MDX body) by slug, or null if missing/unpublished.
export function getGuide(slug: string): PlaybookGuide | null {
  // Guard against path traversal from the dynamic route segment.
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  const file = path.join(PLAYBOOK_DIR, `${slug}.mdx`)
  let raw: string
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch {
    return null
  }
  const guide = parseFrontmatter(slug, raw)
  return isPublished(guide) ? guide : null
}
