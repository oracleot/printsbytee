"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "./ProductCard";
import { Product } from "@/lib/format";

interface ProductGridProps {
  products: Product[];
}

type CategoryFilter = "all" | "lora-set" | "aso-oke-kimono" | "fringe-bubu" | "naya-jump-suit" | "lumi-set" | "jasmine-set" | "seline-dress" | "aso-oke-pant";

export function ProductGrid({ products }: ProductGridProps) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");

  const filters: { value: CategoryFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "lora-set", label: "Lora Set" },
    { value: "lumi-set", label: "Lumi Set" },
    { value: "naya-jump-suit", label: "Naya Jump Suit" },
    { value: "jasmine-set", label: "Jasmine Set" },
    { value: "seline-dress", label: "Seline Dress" },
    { value: "aso-oke-kimono", label: "Aso Oke Kimono Set" },
    { value: "aso-oke-pant", label: "Aso Oke Pant" },
    { value: "fringe-bubu", label: "Fringe Bubu" },
  ];

  const filteredProducts = activeFilter === "all" 
    ? products 
    : products.filter(p => p.category === activeFilter);

  return (
    <div className="space-y-8">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveFilter(filter.value)}
            aria-pressed={activeFilter === filter.value}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-full ${
              activeFilter === filter.value
                ? "bg-black text-cream"
                : "bg-cream text-black hover:bg-gold hover:text-black"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Product Count */}
      <p aria-live="polite" className="text-center text-sm text-black/60">
        Showing {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
      </p>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-cream flex items-center justify-center">
              <svg className="w-10 h-10 text-black/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="font-heading text-xl font-semibold text-black mb-2">
              No products found
            </h3>
            <p className="text-black/60">
              We couldn{`'`}t find any products in this category. Try browsing all products instead.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}