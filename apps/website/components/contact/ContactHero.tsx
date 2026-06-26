"use client";

import { motion } from "framer-motion";

export function ContactHero() {
  return (
    <section className="pt-32 pb-12 bg-cream relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="contact-pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="none" stroke="#C9A84C" strokeWidth="0.5"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#contact-pattern)"/>
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-gold text-sm tracking-[0.2em] uppercase font-medium"
        >
          Get in Touch
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-black mt-4 mb-6"
        >
          Contact Us
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-black/70 text-lg max-w-2xl mx-auto"
        >
          Have a question about our products or want to place a custom order?
          We&apos;d love to hear from you.
        </motion.p>
      </div>
    </section>
  );
}
