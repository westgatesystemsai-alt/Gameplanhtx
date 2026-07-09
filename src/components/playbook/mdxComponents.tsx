import Link from 'next/link'
import type { MDXComponents } from 'mdx/types'

// Styling for the rendered MDX body of a Playbook guide. No Tailwind typography
// plugin is installed, so each element maps to explicit brand-consistent styles
// (ink headings, Outfit display type, #FF4D1F action links).
export const playbookMdxComponents: MDXComponents = {
  h2: ({ children }) => (
    <h2 className="font-outfit mt-10 mb-3 text-2xl font-bold tracking-tight text-ink dark:text-white">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-outfit mt-8 mb-2 text-xl font-semibold text-ink dark:text-white">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-4 leading-relaxed text-gray-700 dark:text-gray-300">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 text-gray-700 dark:text-gray-300">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-ink dark:text-white">{children}</strong>
  ),
  a: ({ href, children }) => (
    <Link
      href={href ?? '#'}
      className="font-medium text-action underline decoration-action/40 underline-offset-2 transition hover:decoration-action"
    >
      {children}
    </Link>
  ),
}
