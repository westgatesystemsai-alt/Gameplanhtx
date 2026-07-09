'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// Desktop nav links show at md (768px) and above; below that a hamburger
// toggles a full-width dropdown with the same links stacked vertically.
export default function Nav() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function close() {
    setOpen(false)
  }

  return (
    <header ref={containerRef} className="sticky top-0 z-40 bg-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-action font-outfit text-lg font-black text-white">
            G
          </span>
          <span className="font-outfit text-lg font-extrabold tracking-tight text-white">
            GAMEPLAN HTX
          </span>
        </Link>

        <div className="hidden items-center gap-4 md:flex md:gap-6">
          <Link
            href="/vendors"
            className="font-outfit text-sm font-semibold text-white transition hover:text-action"
          >
            Browse Vendors
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
          <Link
            href="/login"
            className="font-outfit text-sm font-semibold text-white transition hover:text-action"
          >
            Log in
          </Link>
          <Link
            href="/plan"
            className="rounded-md bg-action px-4 py-2 font-outfit text-sm font-bold text-white transition hover:opacity-90"
          >
            Plan My Event
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span className="block h-0.5 w-6 bg-white" />
          <span className="block h-0.5 w-6 bg-white" />
          <span className="block h-0.5 w-6 bg-white" />
        </button>
      </nav>

      {open && (
        <div className="w-full bg-ink px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="/vendors"
              onClick={close}
              className="font-outfit text-sm font-semibold text-white transition hover:text-action"
            >
              Browse Vendors
            </Link>
            <Link
              href="/build"
              onClick={close}
              className="font-outfit text-sm font-semibold text-white transition hover:text-action"
            >
              Build Your Team
            </Link>
            <Link
              href="/playbook"
              onClick={close}
              className="font-outfit text-sm font-semibold text-white transition hover:text-action"
            >
              Playbook
            </Link>
            <Link
              href="/login"
              onClick={close}
              className="font-outfit text-sm font-semibold text-white transition hover:text-action"
            >
              Log in
            </Link>
            <Link
              href="/plan"
              onClick={close}
              className="rounded-md bg-action px-4 py-3 text-center font-outfit text-sm font-bold text-white transition hover:opacity-90"
            >
              Plan My Event
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
