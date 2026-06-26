"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { testimonials, StarRating } from "./testimonials-data";

export function AnimatedTestimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrent(
      (prev) => (prev + newDirection + testimonials.length) % testimonials.length
    );
  };

  const testimonial = testimonials[current];

  return (
    <section className="py-20 lg:py-28 bg-emerald relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="testimonial-bg" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="1" fill="#F5F0E8" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#testimonial-bg)" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-gold text-sm tracking-[0.2em] uppercase font-medium">
            Customer Love
          </span>
          <h2 className="font-heading text-4xl sm:text-5xl font-black text-cream mt-3 leading-tight">
            What Our Queens Say
          </h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            className="w-16 h-0.5 bg-gold mx-auto mt-4 origin-left"
          />
        </motion.div>

        {/* Card */}
        <div className="relative h-[360px] md:h-[310px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute inset-0"
            >
              <div className="bg-cream rounded-2xl p-8 md:p-12 shadow-2xl h-full flex flex-col justify-between border border-gold/10">
                <div
                  className="text-8xl font-serif leading-none absolute top-2 left-6 opacity-15 select-none"
                  style={{ color: "#1B4D3E", fontFamily: "Georgia, serif" }}
                >
                  &ldquo;
                </div>
                <p className="relative z-10 text-black/80 text-lg md:text-xl leading-relaxed italic pt-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-black/10">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-cream font-bold text-lg shadow-md"
                      style={{ background: testimonial.gradient }}
                    >
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-black">
                        {testimonial.name}
                      </p>
                      <p className="text-black/50 text-sm tracking-wide">{testimonial.location}</p>
                    </div>
                  </div>
                  <StarRating rating={testimonial.rating} />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Arrows */}
          <button
            onClick={() => paginate(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-10 h-10 bg-gold hover:bg-cream transition-colors rounded-full flex items-center justify-center text-black shadow-lg z-20"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => paginate(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-10 h-10 bg-gold hover:bg-cream transition-colors rounded-full flex items-center justify-center text-black shadow-lg z-20"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > current ? 1 : -1);
                setCurrent(index);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === current ? "bg-gold w-6" : "bg-cream/30 hover:bg-cream/50"
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
