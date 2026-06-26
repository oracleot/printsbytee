"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getProductImage, formatPrice, getCategoryLabel, Product } from "@/lib/products";

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  const featuredProducts = products.filter(p => p.featured).slice(0, 4);

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
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-black mt-3">
            Our Best Sellers
          </h2>
        </motion.div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link href={`/products/${product.slug}`} className="group block">
                {/* Product Image */}
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-4 group-hover:shadow-xl transition-shadow duration-300">
                  {product.images?.[0]?.startsWith("/") ?? false ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                      style={{ background: getProductImage(product.images?.[0] ?? '') }}
                    />
                  )}
                  {/* Badge */}
                  {product.inStock && (
                    <span className="absolute top-3 left-3 bg-emerald text-cream text-xs px-2 py-1 font-medium tracking-wide">
                      {(product as Product & { stockLabel?: string }).stockLabel === "low-stock"
                        ? "Low Stock"
                        : "In Stock"}
                    </span>
                  )}
                  {!product.inStock && (
                    <span className="absolute top-3 left-3 bg-gold text-black text-xs px-2 py-1 font-medium tracking-wide">
                      {product.notifyMeEnabled ? "Restocking Soon" : "Sold Out"}
                    </span>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-cream text-black text-sm font-medium px-4 py-2">
                      View Product
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <span className="text-xs text-gold uppercase tracking-wider">
                    {getCategoryLabel(product.category)}
                  </span>
                  <h3 className="font-heading text-lg font-semibold text-black group-hover:text-emerald transition-colors">
                    {product.name}
                  </h3>
                  {product.price !== null && (
                    <p className="text-black/70 font-medium">
                      {formatPrice(product.price)}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
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
