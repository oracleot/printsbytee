"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { HeroOverlay } from "./HeroOverlay";

const HERO_IMAGES = [
  {
    src: "/hero_banner_1.jpg",
    alt: "PrintsByTee — bold African fashion statement",
    position: "center 20%",
  },
  {
    src: "/hero_banner_2.jpg",
    alt: "PrintsByTee — elegant African-inspired style",
    position: "center 20%",
  },
];

/**
 * Layered gradient scrim system for text legibility over photography.
 *
 * 1. CENTER_SCRIM  — soft dark wash where text sits (radial, center-biased)
 * 2. BAND_GRADIENT — vertical band darkening the mid-viewport
 * 3. EDGE_VIGNETTE — subtle edge burn for cinematic framing
 */
const CENTER_SCRIM =
  "radial-gradient(ellipse 60% 45% at 50% 48%, rgba(13,13,13,0.78) 0%, rgba(13,13,13,0.4) 50%, transparent 100%)";
const BAND_GRADIENT =
  "linear-gradient(to bottom, rgba(13,13,13,0.25) 0%, rgba(13,13,13,0.6) 30%, rgba(13,13,13,0.68) 50%, rgba(13,13,13,0.6) 70%, rgba(13,13,13,0.35) 100%)";
const EDGE_VIGNETTE =
  "radial-gradient(ellipse at center, transparent 45%, rgba(13,13,13,0.55) 100%)";

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative w-full bg-black overflow-hidden">
      {/* ── Image grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 items-center min-h-screen">
        {HERO_IMAGES.map((image, index) => (
          <div
            key={image.src}
            className="relative w-full h-[50vh] md:h-screen overflow-hidden group"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={index === 0}
              className="object-cover transition-transform duration-700 md:group-hover:scale-105"
              style={{ objectPosition: image.position }}
              sizes="(max-width: 768px) 100vw, 50vw"
            />

            {/* Edge vignette per image cell */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: EDGE_VIGNETTE }}
            />

            {/* Bottom gradient for section transition */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>
        ))}
      </div>

      {/* ── Gradient scrim for text contrast ────────────── */}
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{ background: CENTER_SCRIM }}
      />
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{ background: BAND_GRADIENT }}
      />

      {/* ── Text overlay (centered over full hero) ── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <HeroOverlay reducedMotion={prefersReducedMotion} />
      </div>

      {/* ── Scroll indicator ────────────────────────────── */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { delay: 1.2, duration: 0.6 }
        }
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.div
          animate={
            prefersReducedMotion ? { opacity: 0 } : { y: [0, 14, 0] }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
          }
          className="flex flex-col items-center gap-2"
        >
          <span className="text-cream/60 text-xs tracking-[0.3em] uppercase">
            Scroll
          </span>
          <div className="w-px h-10 bg-gradient-to-b from-gold/50 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}
