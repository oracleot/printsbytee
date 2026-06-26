"use client";

import { useRef, useState } from "react";
import { ProductGallery } from "./ProductGallery";
import { ProductInfo } from "./ProductInfo";
import { NotifyMeModal } from "./NotifyMeModal";
import { Product } from "@/lib/products";
import { StickyAddToCart } from "@/components/sticky/StickyAddToCart";
import { useStickyAddToCart } from "@/components/sticky/useStickyAddToCart";

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const isStickyVisible = useStickyAddToCart(galleryRef);

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Image Gallery — ref used for IntersectionObserver */}
        <div ref={galleryRef} className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery product={product} />
        </div>

        {/* Product Info */}
        <ProductInfo
          product={product}
          onNotifyMe={() => setIsNotifyModalOpen(true)}
        />
      </div>

      <NotifyMeModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        productName={product.name}
        productId={product.id}
      />

      <StickyAddToCart product={product} isVisible={isStickyVisible} />
    </>
  );
}
