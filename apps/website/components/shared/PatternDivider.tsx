"use client";

import { motion } from "framer-motion";

interface PatternDividerProps {
  variant?: "kasA" | "sankofa" | "geometric" | "diamond";
  className?: string;
}

export function PatternDivider({ variant: _variant = "geometric", className = "" }: PatternDividerProps) {
  void _variant;
  return (
    <div className={`w-full flex items-center justify-center py-8 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl"
      >
        <svg
          viewBox="0 0 1200 60"
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Adinkra-inspired geometric pattern */}
          <defs>
            <pattern id="adinkra-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              {/* Diamond shape */}
              <path d="M30 5 L55 30 L30 55 L5 30 Z" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.6"/>
              {/* Inner diamond */}
              <path d="M30 15 L45 30 L30 45 L15 30 Z" fill="none" stroke="#C9A84C" strokeWidth="1" opacity="0.4"/>
              {/* Center dot */}
              <circle cx="30" cy="30" r="3" fill="#C9A84C" opacity="0.8"/>
            </pattern>
          </defs>
          
          {/* Background pattern strip */}
          <rect x="0" y="15" width="1200" height="30" fill="url(#adinkra-pattern)" opacity="0.3"/>
          
          {/* Center ornament */}
          <g transform="translate(600, 30)">
            {/* Large center diamond */}
            <path d="M0 -20 L20 0 L0 20 L-20 0 Z" fill="none" stroke="#C9A84C" strokeWidth="2"/>
            {/* Inner shape */}
            <path d="M0 -12 L12 0 L0 12 L-12 0 Z" fill="#C9A84C" opacity="0.3"/>
            {/* Corner accents */}
            <path d="M-40 -15 L-25 -15 L-25 0" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.6"/>
            <path d="M40 -15 L25 -15 L25 0" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.6"/>
            <path d="M-40 15 L-25 15 L-25 0" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.6"/>
            <path d="M40 15 L25 15 L25 0" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.6"/>
          </g>
          
          {/* Left decorative line */}
          <line x1="0" y1="30" x2="540" y2="30" stroke="#C9A84C" strokeWidth="1" opacity="0.3"/>
          
          {/* Right decorative line */}
          <line x1="660" y1="30" x2="1200" y2="30" stroke="#C9A84C" strokeWidth="1" opacity="0.3"/>
          
          {/* Small accent dots */}
          <circle cx="520" cy="30" r="2" fill="#C9A84C" opacity="0.5"/>
          <circle cx="680" cy="30" r="2" fill="#C9A84C" opacity="0.5"/>
        </svg>
      </motion.div>
    </div>
  );
}