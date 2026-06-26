"use client";

import { motion } from "framer-motion";
import { Mail, Phone } from "lucide-react";
import { socialLinks } from "@/components/shared/socialLinks";

function normalizePhoneNumber(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
}

function formatPhoneDisplay(digits?: string): string {
  if (!digits) return "";
  // Format as UK/E.164-like: +44 XX XXXX XXXX
  if (digits.startsWith("44") && digits.length === 12) {
    return `+44 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  }
  // Generic international formatting
  return `+${digits}`;
}

export function ContactInfo() {
  const whatsappDigits = normalizePhoneNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  const whatsappDisplay =
    whatsappDigits
      ? formatPhoneDisplay(whatsappDigits)
      : (process.env.NEXT_PUBLIC_WHATSAPP_DISPLAY_NUMBER ?? null);

  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}`
    : "mailto:hello@printsbytee.co.uk";

  const isWhatsApp = !!whatsappDigits;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* Heading + intro */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-black mb-4">
          Let&apos;s Connect
        </h2>
        <p className="text-black/70 leading-relaxed">
          Whether you&apos;re looking for the perfect outfit for a special occasion,
          interested in a custom order, or just want to learn more about our brand,
          we&apos;re here to help. Reach out and let&apos;s start a conversation.
        </p>
      </div>

      {/* Email + WhatsApp */}
      <div className="space-y-4">
        <a
          href="mailto:hello@printsbytee.co.uk"
          className="flex items-center gap-3 text-black hover:text-emerald transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center group-hover:bg-gold/20 transition-colors">
            <Mail className="w-5 h-5 text-gold" />
          </div>
          <span>hello@printsbytee.co.uk</span>
        </a>

        {whatsappDisplay && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-black hover:text-emerald transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center group-hover:bg-gold/20 transition-colors">
              <Phone className="w-5 h-5 text-gold" />
            </div>
            <span>
              {isWhatsApp ? "WhatsApp: " : "Email: "}
              {whatsappDisplay}
            </span>
          </a>
        )}
      </div>

      {/* Social Links */}
      <div>
        <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-gold mb-4">
          Follow Us
        </h3>
        <div className="flex items-center gap-4">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-black hover:bg-gold hover:text-black transition-colors"
              aria-label={social.label}
            >
              <social.Icon className="w-5 h-5" />
            </a>
          ))}
        </div>
      </div>

      {/* Brand quote */}
      <div className="p-6 bg-cream rounded-lg">
        <p className="text-sm text-black/70 italic">
          &quot;We believe every woman deserves to wear her heritage with pride,
          without sacrificing comfort or contemporary style.&quot;
        </p>
      </div>
    </motion.div>
  );
}
