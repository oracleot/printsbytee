"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export function ContactSuccess() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <CheckCircle className="w-16 h-16 text-emerald mb-4" />
      <h3 className="font-heading text-2xl font-semibold text-black mb-2">
        Message Sent!
      </h3>
      <p className="text-black/60 max-w-sm">
        Thank you for reaching out. We&apos;ll get back to you within 24 hours.
      </p>
    </motion.div>
  );
}
