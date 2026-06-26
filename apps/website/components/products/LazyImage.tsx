"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// Minimal 1x1 cream-toned JPEG data URL used as blur placeholder
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

export interface LazyImageProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  gradientFallback?: string;
  /** Skip Intersection Observer and render immediately */
  eager?: boolean;
  /** Mark as LCP image — sets next/image priority */
  priority?: boolean;
}

export function LazyImage({
  src,
  alt,
  sizes,
  className = "",
  gradientFallback,
  eager = false,
  priority = false,
}: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(eager);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  // Reset load/error state when src changes (e.g. reused without remounting)
  if (prevSrc !== src) {
    setPrevSrc(src);
    setIsLoaded(false);
    setHasError(false);
  }

  const isImageSrc = src.startsWith("/") || src.startsWith("http");

  useEffect(() => {
    if (eager) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  const showGradient =
    !isImageSrc || hasError;

  const gradientStyle = gradientFallback
    ? { background: gradientFallback }
    : { background: "linear-gradient(135deg, #f5f0e8 0%, #e8dcc8 100%)" };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Gradient fallback for non-image srcs or errors */}
      {showGradient && (
        <div
          className={`absolute inset-0 ${className}`}
          style={gradientStyle}
          role="img"
          aria-label={alt}
        />
      )}

      {/* Actual image — rendered only when in viewport */}
      {isInView && isImageSrc && !hasError && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          placeholder={priority ? undefined : "blur"}
          blurDataURL={priority ? undefined : BLUR_DATA_URL}
          className={`${className} ${
            eager
              ? "opacity-100"
              : `transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
