"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Page transitions use opacity only — no transform/filter on this wrapper.
 * Otherwise `position: fixed` (modals, sticky bars) is pinned to this box instead of the viewport.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
