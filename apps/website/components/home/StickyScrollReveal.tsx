"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

const storyBlocks = [
  {
    id: "founding",
    title: "Born from Heritage",
    content:
      "PrintsbyTee was born from a desire to bridge the gap between traditional African elegance and modern ready-to-wear fashion. We believe every woman deserves to wear her heritage with pride.",
    accent: "#1B4D3E",
  },
  {
    id: "craftsmanship",
    title: "Crafted with Care",
    content:
      "Each piece tells a story — of craftsmanship, culture, and the vibrant women who inspire us. From rich emerald tones inspired by West African royal courts to warm terracotta savanna sunsets.",
    accent: "#C9A84C",
  },
  {
    id: "community",
    title: "Made for You",
    content:
      "Our designs celebrate the modern diaspora woman — confident, bold, and beautiful. We create fashion that makes you feel seen, celebrated, and connected to your roots.",
    accent: "#C75B39",
  },
];

function StoryBlock({
  block,
}: {
  block: (typeof storyBlocks)[0];
}) {
  return (
    <div className="flex items-start gap-5 mb-12 last:mb-0">
      {/* Accent line */}
      <div
        className="flex-shrink-0 w-1 h-16 rounded-full mt-1"
        style={{ backgroundColor: block.accent }}
      />
      <div className="flex-1">
        <h3 className="font-heading text-xl sm:text-2xl font-bold text-black mb-2">
          {block.title}
        </h3>
        <p className="text-black/70 text-base leading-relaxed">
          {block.content}
        </p>
      </div>
    </div>
  );
}

export function StickyScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.96, 1, 1, 0.96]);

  return (
    <section ref={containerRef} className="py-24 lg:py-32 bg-offwhite relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-gold text-xs tracking-[0.3em] uppercase font-semibold"
          >
            Our Heritage
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-black mt-4 leading-[1.05] tracking-tight"
          >
            Fashion That{" "}
            <span className="text-emerald">Celebrates</span>{" "}
            <span className="text-gold">Identity</span>
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
            className="w-24 h-0.5 bg-gold mx-auto mt-6 origin-left"
          />
        </div>

        {/* Main Content Grid - 2 columns */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          {/* LEFT: Sticky Panel with gradient background */}
          <motion.div
            style={{ opacity, scale }}
            className="lg:sticky lg:top-24 lg:self-start rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="relative aspect-[3/4]">
              <Image
                src="/every-thread-story.png"
                alt="Every thread tells a story of culture, confidence, and timeless elegance"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </motion.div>

          {/* RIGHT: Scrolling Story Blocks */}
          <div className="space-y-8 pt-4">
            {storyBlocks.map((block) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6 }}
              >
                <StoryBlock block={block} />
              </motion.div>
            ))}

            {/* Quote card - connecting the narrative */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-black rounded-xl p-8 mt-8"
            >
              <p className="text-cream/90 text-lg leading-relaxed mb-4">
                We create fashion that honors tradition while embracing modern style — for women who carry their heritage with pride.
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-px bg-gold" />
                <span className="text-gold text-sm font-medium tracking-wider uppercase">
                  Our Mission
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}