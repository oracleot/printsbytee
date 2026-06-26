"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` when the observed element has scrolled OUT of view
 * (i.e. the sticky bar should be visible).
 */
export function useStickyAddToCart(
  galleryRef: React.RefObject<HTMLElement | null>
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Bar shows when gallery is NOT intersecting (scrolled past)
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [galleryRef]);

  return isVisible;
}
