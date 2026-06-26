"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const DISCOUNT_CODE = "PRINT10";

export function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col gap-6 px-1 py-2 text-center">
      <div className="space-y-2">
        <p className="text-gold text-xs tracking-[0.2em] uppercase font-medium">
          Your code is yours
        </p>
        <h2 className="font-heading text-2xl text-cream leading-tight">
          Here&apos;s your 10% discount
        </h2>
      </div>

      {/* Code reveal */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center justify-center">
          <span
            className={cn(
              "font-heading text-3xl tracking-[0.15em] text-gold",
              "border border-dashed border-gold/50 rounded-lg px-6 py-3",
              "bg-gold/10"
            )}
          >
            {DISCOUNT_CODE}
          </span>
        </div>
        <p className="text-sm text-cream/60">
          Copy this code at checkout. Valid for 7 days.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/products"
          className={cn(
            "flex items-center justify-center w-full",
            "bg-gold text-black hover:bg-gold/90",
            "text-sm font-semibold tracking-wide",
            "rounded-lg px-4 py-3 transition-colors duration-200"
          )}
        >
          Shop Now →
        </Link>
        <button
          onClick={onClose}
          className="text-sm text-cream/40 hover:text-cream/70 transition-colors"
        >
          No thanks, I&apos;ll pay full price
        </button>
      </div>
    </div>
  );
}
