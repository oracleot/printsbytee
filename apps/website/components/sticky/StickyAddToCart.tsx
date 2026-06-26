"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Product, formatPrice } from "@/lib/products";

interface StickyAddToCartProps {
  product: Product;
  isVisible: boolean;
}

export function StickyAddToCart({ product, isVisible }: StickyAddToCartProps) {
  const handleEnquire = () => {
    window.location.href = `/contact?product=${encodeURIComponent(product.name)}`;
  };

  return (
    // Mobile-only wrapper — hidden on md and up
    <div className="md:hidden">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="sticky-bar"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-white/10"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Product info */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span
                  className="font-heading text-sm text-cream truncate max-w-[40%] block"
                  title={product.name}
                >
                  {product.name}
                </span>
                {product.price !== null && (
                  <span className="text-sm font-semibold text-gold">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              {/* CTA button */}
              <button
                onClick={handleEnquire}
                className="shrink-0 bg-black text-cream hover:bg-emerald text-sm py-3 px-5 rounded-md font-medium transition-colors border border-white/20"
              >
                Enquire to Order
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
