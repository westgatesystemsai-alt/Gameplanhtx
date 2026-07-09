import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/types";

export const dynamic = "force-dynamic";

const HOW_IT_WORKS = [
  {
    step: "1. Describe Your Event",
    description: "Tell us the occasion, date, guest count, and budget in a few quick steps.",
  },
  {
    step: "2. Get Matched",
    description: "We shortlist vetted Houston vendors who fit your event and are available.",
  },
  {
    step: "3. Book With Confidence",
    description: "Compare quotes, message vendors directly, and book knowing every pro is vetted.",
  },
];

const VALUE_PROPS = [
  {
    title: "Every Vendor Vetted",
    description: "Insurance, licensing, and portfolio checked before a vendor ever joins.",
  },
  {
    title: "Transparent Pricing",
    description: "See real price ranges up front — no guessing games or hidden fees.",
  },
  {
    title: "Responses Guaranteed",
    description: "Vendors are held to a response window, so your inquiries don't go dark.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

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

      {/* Section A — How It Works */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center font-outfit text-2xl font-bold text-ink sm:text-3xl">
            How It Works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-2 text-center">
                <h3 className="font-outfit text-lg font-bold text-ink">{item.step}</h3>
                <p className="text-base">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section B — Browse by Category */}
      <section className="bg-bg px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center font-outfit text-2xl font-bold text-ink sm:text-3xl">
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {((categories ?? []) as Category[]).map((c) => (
              <Link
                key={c.id}
                href={`/vendors?category=${c.slug}`}
                className="flex items-center gap-3 rounded-xl border border-[#E5E2DA] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <span className="text-2xl" aria-hidden>
                  {c.icon ?? "🎉"}
                </span>
                <span className="font-outfit text-sm font-semibold text-ink">{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section C — Why Game Plan HTX */}
      <section className="bg-ink px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center font-outfit text-2xl font-bold text-white sm:text-3xl">
            Why Game Plan HTX
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {VALUE_PROPS.map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-2 text-center">
                <h3 className="font-outfit text-lg font-bold text-white">{item.title}</h3>
                <p className="text-sm" style={{ color: "#9CA3AF" }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
