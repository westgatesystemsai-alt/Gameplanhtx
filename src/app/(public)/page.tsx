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

  const { data: vendorCategoryRows } = await supabase
    .from("vendor_categories")
    .select("category_id, vendors!inner(status)")
    .eq("vendors.status", "approved");

  const vendorCounts = new Map<string, number>();
  for (const row of vendorCategoryRows ?? []) {
    vendorCounts.set(row.category_id, (vendorCounts.get(row.category_id) ?? 0) + 1);
  }

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="bg-ink px-6 py-20 sm:py-28">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <span
            className="font-outfit font-bold uppercase"
            style={{ fontSize: 12, letterSpacing: "0.1em", color: "#FF4D1F" }}
          >
            Houston&apos;s Event Vendor Marketplace
          </span>
          <h1
            className="font-outfit font-black text-white"
            style={{ fontSize: 48, lineHeight: 1.1, letterSpacing: "-1px" }}
          >
            What&apos;s the Game Plan?
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
            {((categories ?? []) as Category[]).map((c) => {
              const count = vendorCounts.get(c.id) ?? 0;
              return (
                <Link
                  key={c.id}
                  href={`/vendors?category=${c.slug}`}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E5E2DA] border-l-[3px] border-l-transparent bg-white px-6 py-5 transition hover:border-l-action hover:shadow-lg"
                >
                  <span style={{ fontSize: 28 }} aria-hidden>
                    {c.icon ?? "🎉"}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-outfit font-bold" style={{ fontSize: 15, color: "#0F1C2E" }}>
                      {c.name}
                    </span>
                    <span style={{ fontFamily: "var(--font-figtree)", fontWeight: 400, fontSize: 13, color: "#6B7280" }}>
                      {count > 0 ? `${count} vendor${count === 1 ? "" : "s"}` : "Coming soon"}
                    </span>
                  </span>
                </Link>
              );
            })}
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
