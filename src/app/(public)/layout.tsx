import Link from 'next/link'

// Shared header/nav for all public-facing pages (home, vendor search,
// categories, /plan, /build, /playbook). Authenticated dashboards live in their
// own route groups with their own chrome, so this nav is scoped to the public
// group. Uses the Game Plan HTX visual identity: navy bar, orange wordmark mark.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-ink">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-action font-outfit text-lg font-black text-white">
              G
            </span>
            <span className="font-outfit text-lg font-extrabold tracking-tight text-white">
              GAMEPLAN HTX
            </span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/vendors"
              className="hidden font-outfit text-sm font-semibold text-white transition hover:text-action sm:block"
            >
              Browse Vendors
            </Link>
            <Link
              href="/build"
              className="hidden font-outfit text-sm font-semibold text-white transition hover:text-action sm:block"
            >
              Build Your Team
            </Link>
            <Link
              href="/playbook"
              className="hidden font-outfit text-sm font-semibold text-white transition hover:text-action sm:block"
            >
              Playbook
            </Link>
            <Link
              href="/plan"
              className="rounded-md bg-action px-4 py-2 font-outfit text-sm font-bold text-white transition hover:opacity-90"
            >
              Plan My Event
            </Link>
          </div>
        </nav>
      </header>
      {children}
    </>
  )
}
