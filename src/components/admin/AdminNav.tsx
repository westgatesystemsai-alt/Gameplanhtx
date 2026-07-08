import Link from 'next/link'

const LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/applications', label: 'Applications' },
  { href: '/admin/vendors', label: 'Vendors' },
  { href: '/admin/bookings', label: 'Bookings' },
]

// Section nav shared by every /admin page. Highlights the active section.
export default function AdminNav({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200 pb-3 dark:border-gray-800">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            active === link.href
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
