"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuccessView } from "@/components/overlay/SuccessView";

interface ExitIntentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSubmit: (email: string) => void;
}

export function ExitIntentPopup({
  isOpen,
  onClose,
  onEmailSubmit,
}: ExitIntentPopupProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onEmailSubmit(email);
    setSubmitted(true);
  }

  function handleClose() {
    setEmail("");
    setSubmitted(false);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AnimatePresence mode="wait">
        {isOpen && (
          <DialogContent
            className="max-w-sm mx-auto"
            showCloseButton={false}
            aria-label={
              submitted
                ? "Your discount code"
                : "Get 10% off before you go"
            }
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {!submitted ? (
                <OfferView
                  email={email}
                  onEmailChange={setEmail}
                  onSubmit={handleSubmit}
                  onClose={handleClose}
                />
              ) : (
                <SuccessView onClose={handleClose} />
              )}
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

function OfferView({
  email,
  onEmailChange,
  onSubmit,
  onClose,
}: {
  email: string;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 px-1 py-2">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-cream/60 hover:text-cream transition-colors"
        aria-label="Close"
      >
        <XIcon className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-gold text-xs tracking-[0.2em] uppercase font-medium">
          Before You Go
        </p>
        <h2 className="font-heading text-2xl text-cream leading-tight">
          Get 10% off your first order
        </h2>
        <p className="text-sm text-cream/70 leading-relaxed">
          Join the PrintsbyTee family. Be the first to know about new drops,
          exclusive offers, and style inspiration.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="Your email address"
          required
          autoComplete="email"
          className={cn(
            "w-full rounded-lg bg-black/40 border border-white/15",
            "px-4 py-3 text-sm text-cream placeholder:text-cream/40",
            "focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30",
            "transition-colors"
          )}
          aria-label="Email address"
        />
        <Button
          type="submit"
          className={cn(
            "w-full bg-gold text-black hover:bg-gold/90",
            "text-sm font-semibold tracking-wide",
            "transition-colors duration-200"
          )}
        >
          Claim My Discount
        </Button>
      </form>

      {/* Footer note */}
      <p className="text-center text-xs text-cream/40">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}

