"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In production, this would call /api/newsletter
    setStatus("success");
    setMessage("You're on the list! We'll be in touch soon.");
    setEmail("");
    
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 5000);
  };

  return (
    <section className="py-20 bg-emerald relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="newsletter-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <path d="M7.5 0 L15 7.5 L7.5 15 L0 7.5 Z" fill="none" stroke="#C9A84C" strokeWidth="0.5"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#newsletter-pattern)"/>
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <span className="text-gold text-sm tracking-[0.2em] uppercase font-medium">
            Stay Connected
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-cream mt-3 mb-4">
            Join the PrintsbyTee Family
          </h2>
          <p className="text-cream/80 mb-8">
            Be the first to know about new arrivals, exclusive collections, and special offers. 
            Sign up for our newsletter and get 10% off your first order.
          </p>

          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-center gap-2 text-cream"
              >
                <CheckCircle className="w-5 h-5 text-gold" />
                <span>{message}</span>
              </motion.div>
            ) : (
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading"}
                  className="flex-1 bg-cream border-0 text-black placeholder:text-black/50"
                />
                <Button
                  type="submit"
                  disabled={status === "loading"}
                  className="bg-gold text-black hover:bg-cream disabled:opacity-50 whitespace-nowrap"
                >
                  {status === "loading" ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Subscribing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Subscribe
                      <Send className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-cream/50 text-xs mt-4">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </motion.div>
      </div>
    </section>
  );
}