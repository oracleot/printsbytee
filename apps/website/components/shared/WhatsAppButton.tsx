"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

function normalizePhoneNumber(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
}

interface WhatsAppButtonProps {
  message?: string;
  className?: string;
}

export function WhatsAppButton({
  message = "Hi, I'm interested in PrintsbyTee products",
  className = "",
}: WhatsAppButtonProps) {
  const whatsappNumber = normalizePhoneNumber(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  );
  if (!whatsappNumber) return null;

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`fixed bottom-10 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white pl-3 pr-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow group ${className}`}
    >
      <MessageCircle className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium text-sm whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-48 transition-all duration-300 ease-in-out">
        Chat on WhatsApp
      </span>
    </motion.a>
  );
}
