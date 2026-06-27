"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getProductImage, formatPrice, getCategoryLabel, Product } from "@/lib/products";

interface BentoGridProps {
  products: Product[];
}

interface BentoItem {
  id: string;
  slug: string;
  name: string;
  category: Product["category"];
  price: number | null;
  inStock: boolean;
  notifyMeEnabled: boolean;
  stockLabel?: string;
  imageKey: string;
  isLargeCard: boolean;
}

function BentoCard({ item, index }: { item: BentoItem; index: number }) {
  const isLarge = item.isLargeCard;
  const isSmall = !item.isLargeCard;

  const badgeOffset = isSmall ? "top-3 left-3" : "top-4 left-4";
  const minHeight = isSmall ? "min-h-[200px]" : "min-h-[280px] md:min-h-[0px]";
  const innerLayout = isLarge
    ? "flex flex-col justify-center items-start"
    : "";

  // Large card: full width on mobile (col-span-2), half+double-row on desktop (md:col-span-2 md:row-span-2)
  // Small cards: half width on mobile (col-span-1), quarter width on desktop (md:col-span-1)
  const spanClass = isLarge
    ? "col-span-2 md:col-span-2 md:row-span-2"
    : "col-span-1 md:col-span-1";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative group ${spanClass} min-h-0`}
    >
      <Link href={`/products/${item.slug}`} className="block h-full">
        <div
          className={`relative h-full ${minHeight} rounded-xl overflow-hidden transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl ${innerLayout}`}
        >
          {/* Product Image or Gradient */}
          {item.imageKey.match(/^(\/|https?:)/) ? (
            <Image
              src={item.imageKey}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: getProductImage(item.imageKey) }}
            />
          )}
          {/* Decorative pattern overlay */}
          <div className="absolute inset-0 opacity-10 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id={`bento-pattern-${item.id}`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="none" stroke="#F5F0E8" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill={`url(#bento-pattern-${item.id})`} />
            </svg>
          </div>

          {/* Badge */}
          {item.inStock ? (
            <span className={`absolute ${badgeOffset} bg-emerald text-cream text-xs px-3 py-1.5 font-medium tracking-wide z-10 rounded`}>
              {item.stockLabel === "low-stock" ? "Low Stock" : "In Stock"}
            </span>
          ) : (
            <span className={`absolute ${badgeOffset} bg-gold text-black text-xs px-3 py-1.5 font-medium tracking-wide z-10 rounded`}>
              {item.notifyMeEnabled ? "Restocking Soon" : "Sold Out"}
            </span>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 z-20">
            <span className="bg-cream text-black text-sm font-medium px-4 py-2">
              View Product
            </span>
          </div>

          {/* Bottom info - always at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <span className="text-xs text-gold uppercase tracking-wider">
              {getCategoryLabel(item.category)}
            </span>
            <h3 className="font-heading text-lg font-semibold text-white group-hover:text-gold transition-colors mt-1">
              {item.name}
            </h3>
            {item.price !== null && (
              <p className="text-white/80 font-medium text-sm mt-1">
                {formatPrice(item.price)}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function BentoGrid({ products }: BentoGridProps) {
  const featuredProducts = products.filter((p) => p.featured).slice(0, 5);

  // Create bento layout items
  const bentoItems: BentoItem[] = featuredProducts.map((product, index) => {
    // First item is large (2 cols × 2 rows); all others are 1×1
    const isLargeCard = index === 0;

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      inStock: product.inStock,
      notifyMeEnabled: product.notifyMeEnabled,
      stockLabel: (product as Product & { stockLabel?: string }).stockLabel,
      imageKey: product.images?.[0] ?? 'gradient-emerald-gold',
      isLargeCard,
    };
  });

  return (
    <section className="py-20 bg-offwhite">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-gold text-sm tracking-[0.2em] uppercase font-medium">
            Featured Collection
          </span>
          <h2 className="font-heading text-4xl sm:text-5xl font-black text-black mt-3 leading-tight">
            Our Best Sellers
          </h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            className="w-16 h-0.5 bg-gold mx-auto mt-4 origin-left"
          />
        </motion.div>

        {/* Bento Grid - 2 cols mobile → 4 cols desktop, auto rows mobile → fixed 540px desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 md:h-[540px] md:grid-rows-2">
          {bentoItems.map((item, index) => (
            <BentoCard key={item.id} item={item} index={index} />
          ))}
        </div>

        {/* View All CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-black font-medium hover:text-emerald transition-colors group"
          >
            View All Products
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
