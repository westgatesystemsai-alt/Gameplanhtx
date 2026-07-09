import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="bg-ink px-6 py-20 sm:py-28">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <h1
            className="font-outfit font-black text-white"
            style={{ fontSize: 48, lineHeight: 1.1, letterSpacing: "-1px" }}
          >
            Houston&apos;s Event Vendor Marketplace
          </h1>
          <p
            className="max-w-2xl"
            style={{ fontFamily: "var(--font-figtree)", fontWeight: 400, fontSize: 18, color: "#9CA3AF" }}
          >
            Every vendor vetted. Every inquiry answered. Your event, game-planned.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/plan"
              className="rounded-md bg-action px-7 py-3 font-outfit text-base font-bold text-white transition hover:opacity-90"
            >
              Plan My Event
            </Link>
            <Link
              href="/vendors"
              className="rounded-md border border-white/70 px-7 py-3 font-outfit text-base font-semibold text-white transition hover:bg-white/10"
            >
              Browse Vendors
            </Link>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="bg-[#152438] px-6 py-4">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-2 text-center">
          <span className="font-outfit text-sm font-semibold text-white">✓ Vetted Vendors</span>
          <span className="font-outfit text-sm font-semibold text-white">⚡ Fast Responses</span>
          <span className="font-outfit text-sm font-semibold text-white">★ Verified Reviews</span>
        </div>
      </div>

      {/* Intro */}
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
        <h2 className="font-outfit text-2xl font-bold text-ink">
          One roof for your whole event team
        </h2>
        <p className="text-lg">
          Every event vendor Houston has to offer — vetted, bookable, and under one roof.
          Tell us about your event and we&apos;ll build your shortlist.
        </p>
        <Link
          href="/plan"
          className="mt-2 rounded-md bg-action px-7 py-3 font-outfit text-base font-bold text-white transition hover:opacity-90"
        >
          Plan My Event
        </Link>
      </section>
    </main>
  );
}
