type PublicPageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function PublicPageHero({ eyebrow, title, subtitle }: PublicPageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div className="pointer-events-none absolute inset-0 hero-flame opacity-80" />
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-[0.25]" />
      <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-awok-ember/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-awok-gold/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-3 py-12 sm:px-4 sm:py-16 md:px-6 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-awok-gold">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl break-words font-display text-3xl font-extrabold leading-[1.15] text-awok-cream sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-awok-muted md:text-xl">{subtitle}</p>
      </div>
    </section>
  );
}
