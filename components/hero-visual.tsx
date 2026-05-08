"use client";

import { motion } from "framer-motion";

/** Abstract hero art: flames, embers, wok ring — no brand logo image per product direction. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto flex h-[min(420px,70vw)] w-full max-w-[420px] items-center justify-center md:h-[480px] md:max-w-[480px]">
      {/* Ambient orbs */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-awok-ember/35 via-awok-crimson/20 to-transparent blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-6 left-1/2 h-40 w-[120%] -translate-x-1/2 rounded-[100%] bg-gradient-to-t from-awok-gold/25 via-awok-ember/15 to-transparent blur-2xl"
        animate={{ opacity: [0.35, 0.6, 0.35], y: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Wok ring (vector feel, not the logo) */}
      <motion.div
        className="relative z-10 flex aspect-square w-[min(72%,280px)] items-center justify-center rounded-full border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent shadow-[0_0_80px_rgba(255,107,44,0.25)] backdrop-blur-sm md:w-[min(78%,320px)]"
        initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.1 }}
      >
        <motion.div
          className="absolute inset-[10%] rounded-full border border-awok-ember/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-[18%] rounded-full border border-awok-gold/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 64, repeat: Infinity, ease: "linear" }}
        />
        <span className="relative z-[1] font-display text-5xl font-extrabold tracking-tight text-gradient-fire md:text-6xl">
          火
        </span>
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 180deg, transparent, rgba(255,107,44,0.12), transparent, rgba(232,197,71,0.1), transparent)",
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Flame silhouettes (SVG) */}
      <svg
        className="pointer-events-none absolute -bottom-4 left-1/2 z-[5] w-[110%] max-w-none -translate-x-1/2 overflow-visible text-awok-ember md:-bottom-6 md:w-[125%]"
        viewBox="0 0 400 140"
        aria-hidden
      >
        <defs>
          <linearGradient id="flameA" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ff6b2c" stopOpacity="0" />
            <stop offset="45%" stopColor="#ff8a3d" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e8c547" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="flameB" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c42b2b" stopOpacity="0" />
            <stop offset="50%" stopColor="#ff6b2c" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffd08a" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <motion.path
          fill="url(#flameA)"
          d="M120 130 Q100 40 200 10 Q300 50 280 130 Z"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.path
          fill="url(#flameB)"
          d="M180 130 Q160 55 230 25 Q310 70 290 130 Z"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.path
          fill="url(#flameA)"
          d="M240 130 Q220 48 320 20 Q380 80 360 130 Z"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      {/* Floating embers */}
      {[...Array(8)].map((_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-awok-gold shadow-[0_0_12px_rgba(232,197,71,0.9)]"
          style={{
            left: `${18 + (i * 11) % 64}%`,
            top: `${22 + (i * 7) % 38}%`,
          }}
          animate={{
            y: [0, -28 - (i % 4) * 8, 0],
            x: [0, (i % 2 === 0 ? 1 : -1) * 10, 0],
            opacity: [0, 1, 0.4, 0],
            scale: [0.6, 1.2, 0.8],
          }}
          transition={{
            duration: 3.2 + (i % 3) * 0.4,
            repeat: Infinity,
            delay: i * 0.35,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
