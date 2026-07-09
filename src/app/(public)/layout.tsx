import Link from 'next/link'
import Nav from './Nav'

// Shared header/nav for all public-facing pages (home, vendor search,
// categories, /plan, /build, /playbook). Authenticated dashboards live in their
// own route groups with their own chrome, so this nav is scoped to the public
// group. Uses the Game Plan HTX visual identity: navy bar, orange wordmark mark.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      <footer className="bg-ink px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-action font-outfit text-lg font-black text-white">
              G
            </span>
            <span className="font-outfit text-lg font-extrabold tracking-tight text-white">
              GAMEPLAN HTX
            </span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link
              href="/vendors"
              className="font-outfit text-sm font-semibold text-white transition hover:text-action"
            >
              Browse Vendors
            </Link>
            <Link
              href="/plan"
              className="font-outfit text-sm font-semibold text-white transition hover:text-action"
            >
              Plan My Event
            </Link>
            <Link
              href="/build"
              className="font-outfit text-sm font-semibold text-white transition hover:text-action"
            >
              Build Your Team
            </Link>
            <Link
              href="/playbook"
              className="font-outfit text-sm font-semibold text-white transition hover:text-action"
            >
              Playbook
            </Link>
          </nav>
          <p className="font-outfit text-sm font-semibold text-white">
            © 2026 Game Plan HTX. All rights reserved.
          </p>
        </div>
        <div className="mx-auto mt-6 flex max-w-6xl justify-center gap-4 border-t border-white/10 pt-6 sm:justify-start">
          <Link
            href="/terms"
            className="font-outfit text-xs"
            style={{ color: "#6B7280" }}
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="font-outfit text-xs"
            style={{ color: "#6B7280" }}
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    </>
  )
}
