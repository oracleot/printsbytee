"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getProductGradient, Product } from "@/lib/products";
import { LazyImage } from "./LazyImage";

interface ProductGalleryProps {
  product: Product;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const images = product.images ?? [];
  const total = images.length;

  // Preload all product images so switching is instant
  useEffect(() => {
    images.forEach((src) => {
      if (src.startsWith("/") || src.startsWith("http")) {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = src;
        document.head.appendChild(link);
      }
    });
  }, [images]);

  // Guard: if no images, render nothing visible
  if (total === 0) {
    return (
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-cream" />
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-cream">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="absolute inset-0"
          >
            <LazyImage
              src={images[currentIndex]}
              alt={`${product.name} – image ${currentIndex + 1}`}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              gradientFallback={getProductGradient(images[currentIndex])}
              eager
              priority
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-cream/80 backdrop-blur-sm rounded-full flex items-center justify-center text-black hover:bg-cream transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-cream/80 backdrop-blur-sm rounded-full flex items-center justify-center text-black hover:bg-cream transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-cream text-xs px-3 py-1 rounded-full">
          {currentIndex + 1} / {total}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {total > 1 && (
        <div className="relative flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              type="button"
              key={`${product.id}-thumb-${index}`}
              onClick={() => setCurrentIndex(index)}
              aria-pressed={currentIndex === index}
              className={`relative w-20 h-24 flex-shrink-0 rounded-md overflow-hidden transition-all ${
                currentIndex === index
                  ? "ring-2 ring-gold ring-offset-2"
                  : "opacity-60 hover:opacity-100"
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <LazyImage
                src={image}
                alt={`${product.name} thumbnail ${index + 1}`}
                className="object-cover"
                sizes="80px"
                gradientFallback={getProductGradient(image)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}