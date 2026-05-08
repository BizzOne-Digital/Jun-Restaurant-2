"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const heroEase = [0.22, 1, 0.36, 1] as const;

const MotionLink = motion.create(Link);

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: heroEase } },
};

export function HeroCopyBlock() {
  return (
    <motion.div className="max-w-xl space-y-6" variants={container} initial="hidden" animate="show">
      <motion.p variants={item} className="text-xs font-semibold uppercase tracking-[0.35em] text-awok-gold">
        Hayward · Chinese · Bowls · Noodles
      </motion.p>
      <motion.h1
        variants={item}
        className="font-display text-3xl font-extrabold leading-[1.08] text-awok-cream sm:text-4xl md:text-5xl lg:text-6xl"
      >
        <span className="text-gradient-fire">Fire-forged</span> flavor.{" "}
        <span className="text-awok-cream">Street-luxe</span> dining.
      </motion.h1>
      <motion.p variants={item} className="text-base text-awok-muted md:text-lg md:leading-relaxed">
        A Wok delivers premium Chinese comfort with wok-hei heat, vivid spice, and plating that belongs on the
        night-out circuit.
      </motion.p>
      <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
        <MotionLink
          href="/menu"
          className="relative inline-flex min-h-[52px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-awok-ember via-awok-ember2 to-awok-gold px-10 py-4 text-base font-bold uppercase tracking-wide text-awok-deep shadow-glow md:min-h-[56px] md:px-14 md:text-lg"
          whileHover={{ scale: 1.04, boxShadow: "0 0 48px rgba(255,107,44,0.45)" }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        >
          Order now
        </MotionLink>
        <MotionLink
          href="/menu"
          className="inline-flex rounded-full border border-white/15 bg-white/5 px-8 py-3 text-sm font-semibold text-awok-cream backdrop-blur transition-colors duration-300 hover:border-awok-gold/50 hover:bg-white/[0.12]"
          whileHover={{ scale: 1.02, borderColor: "rgba(232,197,71,0.45)" }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
        >
          View menu
        </MotionLink>
      </motion.div>
    </motion.div>
  );
}

export function FeaturedCard({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: heroEase }}
      whileHover={{ y: -8, transition: { duration: 0.22 } }}
      className="group relative overflow-hidden rounded-2xl border border-white/6 bg-awok-panel/85 shadow-lift transition-[box-shadow,border-color] duration-300 hover:border-awok-ember/45 hover:shadow-[0_24px_56px_rgba(0,0,0,0.55),0_0_40px_rgba(255,107,44,0.22)]"
    >
      {children}
    </motion.article>
  );
}

export function WhyCard({
  title,
  body,
  index,
}: {
  title: string;
  body: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: heroEase }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass-panel rounded-2xl p-6 fire-border transition-shadow duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
    >
      <h3 className="font-display text-xl font-bold text-awok-cream">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-awok-muted">{body}</p>
    </motion.div>
  );
}

export function SectionReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.55, ease: heroEase }}
    >
      {children}
    </motion.div>
  );
}
