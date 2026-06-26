"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { getCategoryLabel, formatPrice, Product } from "@/lib/products";
import { ProductSizeSelector } from "./ProductSizeSelector";
import { ProductAccordion } from "./ProductAccordion";
import { ProductCTA } from "./ProductCTA";

interface ProductInfoProps {
  product: Product;
  onNotifyMe: () => void;
}

export function ProductInfo({ product, onNotifyMe }: ProductInfoProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const stockLabel = (product as Product & { stockLabel?: string }).stockLabel;
  const isLowStock = stockLabel === "low-stock";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Category Badge */}
      <Badge
        variant="secondary"
        className="bg-cream text-emerald hover:bg-cream text-sm font-medium tracking-wide"
      >
        {getCategoryLabel(product.category)}
      </Badge>

      {/* Product Name */}
      <h1 className="font-heading text-3xl sm:text-4xl font-bold text-black">
        {product.name}
      </h1>

      {/* Price */}
      {product.price && (
        <p className="text-2xl font-semibold text-gold">
          {formatPrice(product.price)}
        </p>
      )}

      {/* Stock Status */}
      <div>
        {product.inStock ? (
          <span className="inline-flex items-center gap-2 text-sm text-emerald font-medium">
            <span className="w-2 h-2 bg-emerald rounded-full" />
            {isLowStock ? "Low Stock" : "In Stock"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm text-gold font-medium">
            <span className="w-2 h-2 bg-gold rounded-full" />
            {product.notifyMeEnabled ? "Sold Out - Restocking Soon" : "Sold Out"}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-black/70 leading-relaxed text-base">
        {product.description}
      </p>

      {/* Divider */}
      <hr className="border-border" />

      {/* Size Selector */}
      <ProductSizeSelector
        sizes={product.sizes}
        selectedSize={selectedSize}
        onSelect={setSelectedSize}
      />

      {/* Quantity */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-black">Quantity</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-md border border-border bg-cream hover:bg-gold/20 flex items-center justify-center text-black transition-colors"
          >
            -
          </button>
          <span className="w-16 text-center font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 rounded-md border border-border bg-cream hover:bg-gold/20 flex items-center justify-center text-black transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* CTAs */}
      <ProductCTA
        product={product}
        selectedSize={selectedSize}
        onNotifyMe={onNotifyMe}
      />

      {/* Product Details Accordion */}
      <ProductAccordion category={product.category} />
    </motion.div>
  );
}
