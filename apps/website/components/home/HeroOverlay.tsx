"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: "easeOut" as const },
});

const instant = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  transition: { duration: 0 },
};

interface HeroOverlayProps {
  reducedMotion: boolean | null;
}

export function HeroOverlay({ reducedMotion }: HeroOverlayProps) {
  const f = (delay: number) => (reducedMotion ? instant : fade(delay));

  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto px-4">
      <motion.span
        {...f(0.1)}
        className="inline-block text-gold text-xs tracking-[0.4em] uppercase font-semibold mb-6 border border-gold/40 px-4 py-1 backdrop-blur-[2px] bg-black/20"
      >
        Ready-to-Wear African Fashion
      </motion.span>

      <motion.h1
        {...f(0.3)}
        className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-cream mb-6 leading-[0.92] tracking-tight"
        style={{
          textShadow:
            "0 2px 30px rgba(0,0,0,0.7), 0 1px 8px rgba(0,0,0,0.5)",
        }}
      >
        WEAR YOUR <span className="text-gold">STORY</span>
      </motion.h1>

      <motion.p
        {...f(0.5)}
        className="text-cream/90 text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]"
      >
        Bold prints. Contemporary style. African heritage, reimagined
        for the modern woman.
      </motion.p>

      <motion.div
        {...f(0.7)}
        className="flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <Link
          href="/products"
          className="inline-flex items-center gap-3 bg-gold text-black px-10 py-5 font-bold text-sm tracking-[0.15em] uppercase hover:bg-cream transition-all duration-300 shadow-xl shadow-gold/20 hover:shadow-gold/40"
        >
          Shop Now
          <ArrowRight className="w-5 h-5" />
        </Link>
        <a
          href="mailto:hello@printsbytee.co.uk"
          className="inline-flex items-center gap-2 text-cream hover:text-gold text-sm tracking-[0.15em] uppercase font-medium transition-colors duration-300 border-b border-cream/50 hover:border-gold pb-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
        >
          Custom Orders
        </a>
      </motion.div>
    </div>
  );
}
