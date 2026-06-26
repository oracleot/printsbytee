"use client";

import { motion } from "framer-motion";

export function BrandStory() {
  return (
    <section className="py-20 lg:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="text-gold text-sm tracking-[0.2em] uppercase font-medium">
              Our Story
            </span>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-black leading-tight">
              Fashion That <br/>
              <span className="text-emerald">Celebrates Identity</span>
            </h2>
            <p className="text-black/70 text-lg leading-relaxed">
              PrintsbyTee was born from a desire to bridge the gap between traditional African elegance and modern ready-to-wear fashion. We believe every woman deserves to wear her heritage with pride, without sacrificing comfort or contemporary style.
            </p>
            <p className="text-black/70 text-lg leading-relaxed">
              Each piece in our collection tells a story — of craftsmanship, culture, and the vibrant women who inspire us. From the rich emerald tones inspired by West African royal courts to the warm terracotta of Savanna sunsets, every print is carefully curated to make you feel confident and beautiful.
            </p>
            <div className="pt-4">
              <div className="inline-flex items-center gap-3 text-emerald font-medium">
                <span className="w-12 h-px bg-emerald" />
                Bold & Beautiful
              </div>
            </div>
          </motion.div>

          {/* Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div 
              className="relative aspect-[4/5] rounded-lg overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #1B4D3E 0%, #0D0D0D 40%, #C9A84C 70%, #F5F0E8 100%)',
              }}
            >
              {/* Decorative overlay */}
              <div className="absolute inset-0 opacity-20">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <pattern id="brand-pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="none" stroke="#F5F0E8" strokeWidth="0.5"/>
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#brand-pattern)"/>
                </svg>
              </div>
              
              {/* Label overlay */}
              <div className="absolute bottom-6 left-6 right-6 bg-cream/90 backdrop-blur-sm p-4">
                <p className="font-heading text-sm text-black tracking-wider">
                  @printsbytee
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}