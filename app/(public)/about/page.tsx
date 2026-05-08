import Link from "next/link";
import { PublicPageHero } from "@/components/public-page-hero";
import { SectionReveal, WhyCard } from "@/components/home-hero-motion";

export const metadata = {
  title: "About | A Wok",
  description: "Premium Chinese street-food in Hayward — wok heat, bold spice, and a night-out ritual.",
};

export default function AboutPage() {
  const pillars = [
    {
      title: "Wok-hei first",
      body: "High-heat searing builds the smoky aroma that defines great Chinese cooking. We chase that finish on every plate.",
    },
    {
      title: "Ingredients with intent",
      body: "Crisp produce, proteins prepped daily, and sauces layered for depth — not one-note sweetness.",
    },
    {
      title: "Pickup, elevated",
      body: "Fast handoff without compromising presentation. Street-food soul with dining-room polish.",
    },
  ];

  return (
    <div>
      <PublicPageHero
        eyebrow="Our story"
        title="Fire-forged flavor in the East Bay"
        subtitle="A Wok is a modern Chinese kitchen built for guests who want heat, texture, and color in every bite — whether you are grabbing lunch or feeding the crew."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <SectionReveal>
            <div className="glass-panel rounded-3xl p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">Philosophy</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-awok-cream md:text-4xl">Street-luxe, not street-rushed</h2>
              <p className="mt-5 text-base leading-relaxed text-awok-muted md:text-lg">
                We grew up on night-market energy — sizzling pans, chili oil gleam, and the first bite that makes you close
                your eyes. A Wok brings that same adrenaline to Hayward with a premium lens: cleaner plates, sharper
                contrast, and hospitality that respects your time.
              </p>
              <p className="mt-4 text-base leading-relaxed text-awok-muted md:text-lg">
                From the wok section to fried rice and noodles, every category is tuned for craveability. Popular items
                surface automatically from real orders, and limited-time BOGO offers are set thoughtfully by our team.
              </p>
              <Link
                href="/menu"
                className="mt-8 inline-flex rounded-full bg-gradient-to-r from-awok-ember via-awok-ember2 to-awok-gold px-8 py-3 text-sm font-bold uppercase tracking-wide text-awok-deep shadow-glow transition hover:shadow-[0_0_40px_rgba(255,107,44,0.35)]"
              >
                Explore the menu
              </Link>
            </div>
          </SectionReveal>

          <div className="space-y-5">
            {pillars.map((p, i) => (
              <WhyCard key={p.title} title={p.title} body={p.body} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-black/25 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <SectionReveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">Visit</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-awok-cream">Hayward · 1025 A St</h2>
            <p className="mx-auto mt-4 max-w-xl text-awok-muted">
              Pull up for pickup, check live hours on the home page, and follow us for specials.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/#location"
                className="inline-flex rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-awok-cream transition hover:border-awok-gold/45 hover:bg-white/[0.08]"
              >
                Location &amp; map
              </Link>
              <Link
                href="/contact"
                className="inline-flex rounded-full border border-awok-ember/40 px-6 py-2.5 text-sm font-semibold text-awok-ember2 transition hover:border-awok-gold/50 hover:bg-awok-ember/10"
              >
                Contact us
              </Link>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}
