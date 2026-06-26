"use client";

import { Copy, Check } from "lucide-react";

export const DISCOUNT_CODE = "PRINT10";

interface SuccessStateProps {
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}

export function SuccessState({ copied, onCopy, onClose }: SuccessStateProps) {
  return (
    <div className="text-center">
      <p
        id="exit-intent-title"
        className="mb-2 font-serif text-xl font-semibold tracking-wide text-[#c9a84c]"
      >
        ✨ Your code is yours ✨
      </p>
      <p id="exit-intent-desc" className="mb-5 text-sm text-[#f5f0e8]/70">
        Here&apos;s your 10% discount:
      </p>

      <button
        onClick={onCopy}
        aria-label={copied ? "Code copied" : "Copy discount code PRINT10"}
        className="mx-auto mb-5 flex items-center gap-3 rounded-xl border border-[#c9a84c]/50 bg-white/5 px-6 py-3 font-mono text-2xl font-bold tracking-widest text-[#c9a84c] transition-colors hover:bg-[#c9a84c]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
      >
        {DISCOUNT_CODE}
        {copied ? (
          <Check className="h-5 w-5 text-green-400" />
        ) : (
          <Copy className="h-4 w-4 opacity-60" />
        )}
      </button>

      <p className="mb-4 text-xs text-[#f5f0e8]/50">
        Copy code or tap below to shop
      </p>

      <button
        onClick={onClose}
        className="h-11 w-full rounded-lg bg-[#c9a84c] text-sm font-semibold text-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
      >
        Shop Now →
      </button>
    </div>
  );
}
