"use client";

import { X } from "lucide-react";

interface OfferStateProps {
  email: string;
  emailInputRef: React.RefObject<HTMLInputElement | null>;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function OfferState({
  email,
  emailInputRef,
  closeRef,
  onEmailChange,
  onSubmit,
  onClose,
}: OfferStateProps) {
  return (
    <>
      <button
        ref={closeRef}
        onClick={onClose}
        aria-label="Close popup"
        className="absolute right-4 top-4 text-[#c9a84c]/60 transition-colors hover:text-[#c9a84c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
      >
        <X className="h-5 w-5" />
      </button>

      <p
        id="exit-intent-title"
        className="mb-1 text-center font-serif text-xl font-semibold tracking-wide text-[#c9a84c]"
      >
        ✦ Before You Go ✦
      </p>

      <p
        id="exit-intent-desc"
        className="mb-1 text-center text-lg font-medium text-[#f5f0e8]"
      >
        Get 10% off your first order
      </p>

      <p className="mb-6 text-center text-sm text-[#f5f0e8]/60">
        Join the PrintsbyTee family and celebrate culture in style.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          ref={emailInputRef}
          type="email"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email address"
          className="h-11 w-full rounded-lg border border-[#c9a84c]/30 bg-white/5 px-4 text-sm text-[#f5f0e8] placeholder-[#f5f0e8]/30 outline-none transition-colors focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/30"
        />
        <button
          type="submit"
          className="h-11 w-full rounded-lg bg-[#c9a84c] text-sm font-semibold text-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
        >
          Claim My Discount
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-[#f5f0e8]/40">
        No spam. Unsubscribe anytime.
      </p>
    </>
  );
}
