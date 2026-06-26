"use client";

import React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Sparkles } from "@/components/ui/sparkles";

export function HeroParallax() {
  const { scrollY } = useScroll();

  const backgroundY = useTransform(scrollY, [0, 600], [0, 200]);
  const textY = useTransform(scrollY, [0, 600], [0, -120]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0.2]);

  return (
    <section id="hero" className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
      {/* Parallax Background Layer - Deep emerald base */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0"
      >
        {/* Rich layered gradient - emerald to gold tones */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 80%, #C9A84C 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, #1B4D3E 0%, transparent 40%),
              radial-gradient(ellipse at 50% 50%, #0D0D0D 0%, transparent 60%),
              linear-gradient(160deg, #0D0D0D 0%, #1B4D3E 40%, #0D0D0D 100%)
            `,
          }}
        />

        {/* Diamond pattern overlay - subtle African motif */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="hero-diamond" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M4 0 L8 4 L4 8 L0 4 Z" fill="none" stroke="#C9A84C" strokeWidth="0.3" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#hero-diamond)" />
          </svg>
        </div>

        {/* Dark vignette overlay - ensures text contrast */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(13,13,13,0.3) 0%, rgba(13,13,13,0.1) 40%, rgba(13,13,13,0.6) 100%)",
          }}
        />
      </motion.div>

      {/* Sparkles Background Layer */}
      <div className="absolute inset-0 z-10">
        <Sparkles
          starColor="#C9A84C"
          starSize={3}
          maxStars={60}
          speed={0.6}
          opacity={0.5}
        />
      </div>

      {/* Content Layer */}
      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-20 text-center px-4 max-w-5xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <span className="inline-block text-gold text-xs tracking-[0.4em] uppercase font-semibold mb-8 border border-gold/40 px-4 py-1">
            Ready-to-Wear African Fashion
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
          className="font-heading text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] font-bold text-cream mb-8 leading-[0.9] tracking-tight"
          style={{ textShadow: "0 2px 30px rgba(0,0,0,0.5), 0 1px 8px rgba(0,0,0,0.3)" }}
        >
          WEAR YOUR{" "}
          <span className="text-gold block sm:inline">STORY</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          className="text-cream/90 text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed tracking-wide"
          style={{ textShadow: "0 1px 12px rgba(0,0,0,0.4)" }}
        >
          Bold prints. Contemporary style. African heritage, reimagined for the modern woman.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/products"
            className="inline-flex items-center gap-4 bg-gold text-black px-10 py-5 font-bold text-base tracking-[0.15em] uppercase hover:bg-cream transition-all duration-300 shadow-xl shadow-gold/30 hover:shadow-gold/50"
          >
            Shop Now
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="mailto:hello@printsbytee.co.uk"
            className="inline-flex items-center gap-2 text-cream/80 hover:text-gold text-sm tracking-[0.15em] uppercase font-medium transition-colors duration-300 border-b border-cream/30 hover:border-gold pb-0.5"
          >
            Custom Orders
          </a>
        </motion.div>
      </motion.div>

      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-gold/20 z-20" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-gold/20 z-20" />

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-cream/50 text-[10px] tracking-[0.3em] uppercase">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-gold/50 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}
