import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { FeaturedCard, HeroCopyBlock, SectionReveal, WhyCard } from "@/components/home-hero-motion";
import { HeroVisual } from "@/components/hero-visual";
import { connectDB } from "@/lib/mongodb";
import { resolveRestaurantSlugFromHeadersGetter } from "@/lib/restaurant-resolve";
import { MenuItem } from "@/models/MenuItem";
import { Restaurant } from "@/models/Restaurant";
import { formatCents } from "@/lib/utils";

async function getFeatured() {
  try {
    await connectDB();
    const h = headers();
    const slug = resolveRestaurantSlugFromHeadersGetter((name) => h.get(name));
    let items = await MenuItem.find({ isPopular: true, isAvailable: true })
      .sort({ name: 1 })
      .limit(8)
      .lean();
    if (items.length === 0) {
      items = await MenuItem.find({ isAvailable: true })
        .sort({ purchaseCount: -1, name: 1 })
        .limit(8)
        .lean();
    }
    const restaurant = await Restaurant.findOne({ slug }).lean();
    return { items, restaurant };
  } catch {
    return { items: [], restaurant: null };
  }
}

export default async function HomePage() {
  const { items, restaurant } = await getFeatured();

  const whyBlocks = [
    {
      title: "Fresh ingredients",
      body: "Produce arrives crisp, proteins are prepped daily, and sauces are layered for depth—not sugar bombs.",
    },
    {
      title: "Fast pickup",
      body: "Your wok queue is orchestrated for speed. Grab-and-go that still feels like a night-out ritual.",
    },
    {
      title: "Bold flavors",
      body: "High heat, fragrant oil, chili crackle, and savory finish. Built for guests who want drama in every bite.",
    },
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 hero-flame" />
        <div className="pointer-events-none absolute inset-0 hero-grid opacity-[0.35]" />
        <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 animate-pulse-soft rounded-full bg-awok-ember/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 animate-pulse-soft-alt rounded-full bg-awok-gold/12 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(90vh,820px)] w-[min(90vw,820px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,107,44,0.08)_0%,transparent_65%)]" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-3 pb-12 pt-4 text-center sm:gap-10 sm:px-4 sm:pb-14 sm:pt-5 md:flex-row md:items-center md:justify-between md:gap-8 md:pb-20 md:pt-8 md:text-left lg:gap-12 lg:pt-10">
          <HeroCopyBlock />
          <HeroVisual />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 py-12 sm:px-4 sm:py-16 md:px-6">
        <SectionReveal className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">From the menu</p>
            <h2 className="font-display text-3xl font-bold text-awok-cream md:text-4xl">Crowd favorites</h2>
            <p className="mt-2 max-w-xl text-sm text-awok-muted">
              A taste of what we wok up—browse every category on the full menu.
            </p>
          </div>
          <Link
            href="/menu"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-awok-ember via-awok-ember2 to-awok-gold px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-awok-deep shadow-glow transition hover:shadow-[0_0_32px_rgba(255,107,44,0.4)]"
          >
            See menu
          </Link>
        </SectionReveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.length === 0 && (
            <div className="col-span-full space-y-4 rounded-2xl border border-white/10 bg-awok-panel/50 p-8 text-center">
              <p className="text-awok-muted">No dishes in the menu yet. Run the seed script to populate items.</p>
              <Link
                href="/menu"
                className="inline-flex items-center justify-center rounded-full border border-awok-gold/40 px-6 py-2.5 text-sm font-semibold text-awok-gold transition hover:border-awok-gold/70 hover:bg-awok-gold/10"
              >
                See menu
              </Link>
            </div>
          )}
          {items.map((item, i) => (
            <FeaturedCard key={item._id.toString()} index={i}>
              <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-black/60 to-awok-graphite/80">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover transition duration-700 ease-out group-hover:scale-110"
                    sizes="(max-width:768px) 100vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-awok-ember/10 to-transparent text-sm font-medium text-awok-muted">
                    A Wok
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen transition duration-500 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-tr from-awok-ember/25 via-transparent to-awok-gold/20" />
                </div>
              </div>
              <div className="space-y-2 p-4">
                <h3 className="font-semibold text-awok-cream">{item.name}</h3>
                <p className="text-sm font-semibold text-awok-gold">{formatCents(item.price)}</p>
              </div>
            </FeaturedCard>
          ))}
        </div>
      </section>

      <section className="relative border-y border-white/5 bg-black/25 py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-awok-ember/[0.03] via-transparent to-awok-crimson/[0.04]" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-3 sm:gap-10 sm:px-4 md:grid-cols-3 md:px-6">
          {whyBlocks.map((b, i) => (
            <WhyCard key={b.title} title={b.title} body={b.body} index={i} />
          ))}
        </div>
      </section>

      <section id="hours" className="mx-auto max-w-6xl px-3 py-12 sm:px-4 sm:py-16 md:px-6">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-2">
          <SectionReveal>
            <div className="glass-panel rounded-2xl p-5 transition-shadow duration-300 hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:rounded-3xl sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">Hours</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-awok-cream">Opening times</h3>
              <ul className="mt-6 space-y-3 text-sm text-awok-muted">
                {(restaurant?.openingHours?.length ? restaurant.openingHours : []).map(
                  (h: { day: string; open?: string; close?: string; closed?: boolean }) => (
                    <li key={h.day} className="flex justify-between border-b border-white/5 py-2">
                      <span className="text-awok-cream">{h.day}</span>
                      <span>{h.closed ? "Closed" : `${h.open} – ${h.close}`}</span>
                    </li>
                  )
                )}
                {!restaurant?.openingHours?.length && (
                  <>
                    <li className="flex justify-between border-b border-white/5 py-2">
                      <span className="text-awok-cream">Mon – Thu</span>
                      <span>11:00a – 9:30p</span>
                    </li>
                    <li className="flex justify-between border-b border-white/5 py-2">
                      <span className="text-awok-cream">Fri – Sat</span>
                      <span>11:00a – 10:00p</span>
                    </li>
                    <li className="flex justify-between py-2">
                      <span className="text-awok-cream">Sun</span>
                      <span>11:00a – 9:00p</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </SectionReveal>
          <SectionReveal>
            <div id="location" className="glass-panel rounded-2xl p-5 transition-shadow duration-300 hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:rounded-3xl sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">Location</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-awok-cream">Find A Wok</h3>
              <p className="mt-4 text-awok-muted">{restaurant?.address ?? "1025 A St, Hayward, CA 94541"}</p>
              <p className="mt-2 text-sm text-awok-gold">{restaurant?.phone ?? "(510) 555-0199"}</p>
              <a
                className="mt-6 inline-flex rounded-full border border-awok-ember/40 px-5 py-2 text-sm font-semibold text-awok-ember2 transition hover:border-awok-gold/50 hover:bg-awok-ember/10 hover:shadow-[0_0_24px_rgba(255,107,44,0.2)]"
                href="https://maps.google.com/?q=1025+A+St+Hayward+CA+94541"
                target="_blank"
                rel="noreferrer"
              >
                Open in Maps
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}
