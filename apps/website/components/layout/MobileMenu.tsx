"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { socialLinks } from "@/components/shared/socialLinks";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact" },
];

interface MobileMenuProps {
  onClose: () => void;
}

export function MobileMenu({ onClose }: MobileMenuProps) {
  return (
    <motion.div
      key="menu"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
      className="fixed top-0 right-0 bottom-0 z-[60] w-4/5 max-w-sm bg-cream flex flex-col md:hidden shadow-2xl"
    >
      {/* Menu header */}
      <div className="flex items-center justify-between px-6 h-20 border-b border-border">
        <Link href="/" onClick={onClose} className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0"><Image src="/logo.svg" alt="PrintsbyTee" width={40} height={40} className="h-full w-full" style={{ width: "auto", height: "auto" }} /></div>
        </Link>
        <button onClick={onClose} className="p-2 text-black" aria-label="Close menu">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col flex-1 px-8 pt-10 gap-2">
        {navLinks.map((link, i) => (
          <motion.div
            key={link.href}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
          >
            <Link
              href={link.href}
              className="block font-heading text-3xl font-bold text-black hover:text-gold transition-colors py-3 border-b border-border/40"
              onClick={onClose}
            >
              {link.label}
            </Link>
          </motion.div>
        ))}
      </nav>

      {/* Social icons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="px-8 pb-10"
      >
        <p className="text-xs tracking-[0.2em] uppercase text-gold font-medium mb-4">Follow Us</p>
        <div className="flex items-center gap-5">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:text-gold transition-colors"
              aria-label={social.label}
            >
              <social.Icon className="w-6 h-6" />
            </a>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
