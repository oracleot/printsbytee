"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/products";

interface ProductCTAProps {
  product: Product;
  selectedSize: string | null;
  onNotifyMe: () => void;
}

function normalizePhoneNumber(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
}

export function ProductCTA({ product, selectedSize, onNotifyMe }: ProductCTAProps) {
  const [addedToEnquiry, setAddedToEnquiry] = useState(false);

  const handleEnquire = () => {
    setAddedToEnquiry(true);
    window.location.href = `/contact?product=${encodeURIComponent(product.name)}`;
  };

  const whatsappNumber = normalizePhoneNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  const whatsappMessage = `Hi, I'm interested in the ${product.name}${selectedSize ? ` (Size: ${selectedSize})` : ''}. Can you provide more information?`;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  const enquiryEmail = "enquiries@printsbytee.com";
  const mailtoUrl = `mailto:${enquiryEmail}?subject=${encodeURIComponent(`Enquiry: ${product.name}`)}&body=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="space-y-4">
      {/* Main CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleEnquire}
          disabled={!selectedSize}
          className="flex-1 bg-black text-cream hover:bg-emerald disabled:opacity-50 disabled:cursor-not-allowed text-base py-6"
        >
          <motion.span whileTap={{ scale: 0.98 }} className="flex items-center gap-2">
            {addedToEnquiry ? (
              <>
                <Check className="w-5 h-5" />
                Opening Form...
              </>
            ) : (
              "Enquire to Order"
            )}
          </motion.span>
        </Button>

        {(!product.inStock && product.notifyMeEnabled) && (
          <Button
            onClick={onNotifyMe}
            variant="outline"
            className="border-gold text-gold hover:bg-gold hover:text-black text-base py-6"
          >
            <motion.span whileTap={{ scale: 0.98 }} className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notify Me
            </motion.span>
          </Button>
        )}
      </div>

      {/* WhatsApp quick link */}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-emerald hover:text-gold transition-colors font-medium"
        >
          <MessageCircle className="w-4 h-4" />
          Chat on WhatsApp for quick response
        </a>
      ) : (
        <a
          href={mailtoUrl}
          className="inline-flex items-center gap-2 text-sm text-emerald hover:text-gold transition-colors font-medium"
          title="WhatsApp not configured — email us instead"
        >
          <MessageCircle className="w-4 h-4" />
          Email us for quick response
        </a>
      )}
    </div>
  );
}
