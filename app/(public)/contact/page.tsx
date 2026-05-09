import Link from "next/link";
import { PublicPageHero } from "@/components/public-page-hero";
import { SectionReveal } from "@/components/home-hero-motion";

export const metadata = {
  title: "Contact | A Wok",
  description: "Hours and location for A Wok in Hayward, CA.",
};

export default function ContactPage() {
  return (
    <div>
      <PublicPageHero
        eyebrow="Contact"
        title="We would love to hear from you"
        subtitle="Questions about pickup, large orders, or catering-style trays? Reach out — we reply during business hours."
      />

      <section className="mx-auto max-w-6xl px-3 py-12 sm:px-4 sm:py-14 md:px-6 md:py-20">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
          <SectionReveal>
            <div className="glass-panel h-full rounded-2xl p-5 sm:rounded-3xl sm:p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">Direct</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-awok-cream">A Wok</h2>
              <ul className="mt-8 space-y-5 text-sm text-awok-muted">
                <li>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-awok-gold/90">Address</p>
                  <p className="mt-1 text-awok-cream">1025 A St</p>
                  <p className="text-awok-cream">Hayward, CA 94541</p>
                </li>
                <li>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-awok-gold/90">Hours</p>
                  <p className="mt-1">
                    For the latest schedule, see the{" "}
                    <Link href="/#hours" className="font-semibold text-awok-ember2 hover:underline">
                      hours section
                    </Link>{" "}
                    on the home page — we keep it aligned with what is live in the restaurant.
                  </p>
                </li>
              </ul>
              <a
                href="https://maps.google.com/?q=1025+A+St+Hayward+CA+94541"
                target="_blank"
                rel="noreferrer"
                className="mt-10 inline-flex touch-manipulation rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 px-6 py-3 text-sm font-bold text-awok-deep shadow-glow sm:py-2.5"
              >
                Open in Google Maps
              </a>
            </div>
          </SectionReveal>

          <SectionReveal>
            <div className="glass-panel h-full rounded-2xl p-5 sm:rounded-3xl sm:p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">Ordering</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-awok-cream">Order online</h2>
              <p className="mt-4 leading-relaxed text-awok-muted">
                The fastest way to order is through our site — browse the full menu, customize notes per item, and pay
                securely at checkout.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/menu"
                  className="inline-flex touch-manipulation justify-center rounded-full bg-gradient-to-r from-awok-ember via-awok-ember2 to-awok-gold px-6 py-3 text-center text-sm font-bold text-awok-deep shadow-glow"
                >
                  View menu
                </Link>
                <Link
                  href="/track-order"
                  className="inline-flex touch-manipulation justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-awok-cream transition hover:border-awok-gold/40"
                >
                  Track an order
                </Link>
              </div>
              <p className="mt-8 text-xs leading-relaxed text-awok-muted/85">
                For order issues after payment, include your order number from the confirmation email so we can help
                quickly.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}
