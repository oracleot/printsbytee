"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SparklesProps {
  className?: string;
  starColor?: string;
  starSize?: number;
  starDensity?: number;
  maxStars?: number;
  speed?: number;
  opacity?: number;
  style?: React.CSSProperties;
}

export function Sparkles({
  className = "",
  starColor = "#C9A84C",
  starSize = 4,
  starDensity = 0.3,
  maxStars = 100,
  speed = 1,
  opacity = 0.8,
  style,
}: SparklesProps) {
  const [stars, setStars] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      size: number;
      opacity: number;
      duration: number;
      delay: number;
    }>
  >([]);

  useEffect(() => {
    const generateStars = () => {
      const starCount = Math.round(maxStars * starDensity);
      const newStars = Array.from({ length: starCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * starSize + 1,
        opacity: Math.random() * opacity + 0.2,
        duration: (Math.random() * 3 + 2) / speed,
        delay: Math.random() * 2,
      }));
      setStars(newStars);
    };
    generateStars();
  }, [starSize, starDensity, maxStars, speed, opacity]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={style}>
      <AnimatePresence>
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              backgroundColor: starColor,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, star.opacity, 0],
              scale: [0, 1, 0],
              y: [0, -20 * speed],
            }}
            transition={{
              duration: star.duration,
              delay: star.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
