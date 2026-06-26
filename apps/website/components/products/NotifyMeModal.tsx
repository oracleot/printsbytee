"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface NotifyMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productId: string;
}

export function NotifyMeModal({ isOpen, onClose, productName, productId }: NotifyMeModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, productId }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setEmail("");
    setErrorMessage("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-cream border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-black">
            Get Notified
          </DialogTitle>
          <DialogDescription className="text-black/60">
            Be the first to know when <span className="font-medium text-black">{productName}</span> is back in stock.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
              >
                <CheckCircle className="w-16 h-16 text-emerald mb-4" />
              </motion.div>
              <h3 className="font-heading text-lg font-semibold text-black mb-2">
                You{`'`}re on the list!
              </h3>
              <p className="text-sm text-black/60">
                We{`'`}ll email you as soon as this item is available. Check your inbox for a confirmation.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="notify-email" className="text-sm font-medium text-black">
                  Email Address
                </Label>
                <Input
                  id="notify-email"
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading"}
                  className="w-full bg-offwhite border-border text-black placeholder:text-black/40"
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-terracotta bg-terracotta/10 px-3 py-2 rounded">
                  {errorMessage}
                </p>
              )}

              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-black text-cream hover:bg-emerald disabled:opacity-50"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Notify Me When Available"
                )}
              </Button>

              <p className="text-xs text-black/50 text-center">
                By subscribing, you agree to receive marketing emails from PrintsbyTee. Unsubscribe anytime.
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}