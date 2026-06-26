"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContactSuccess } from "./ContactSuccess";

interface FormData {
  name: string;
  email: string;
  productInterest: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export function ContactForm() {
  const searchParams = useSearchParams();
  const productParam = searchParams.get("product") ?? "";

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    productInterest: productParam,
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setFormData({ name: "", email: "", productInterest: productParam, message: "" });
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection.");
    }
  };

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const inputCls = (field: keyof FormErrors) =>
    `w-full bg-offwhite border-border text-black placeholder:text-black/40 ${errors[field] ? "border-terracotta" : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-cream p-6 sm:p-8 rounded-lg shadow-sm"
    >
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ContactSuccess />
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-black">Name <span className="text-terracotta">*</span></Label>
              <Input id="name" type="text" placeholder="Your full name" value={formData.name} onChange={handleChange("name")} disabled={status === "loading"} className={inputCls("name")} />
              {errors.name && <p className="text-xs text-terracotta">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-black">Email <span className="text-terracotta">*</span></Label>
              <Input id="email" type="email" placeholder="your@email.com" value={formData.email} onChange={handleChange("email")} disabled={status === "loading"} className={inputCls("email")} />
              {errors.email && <p className="text-xs text-terracotta">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="productInterest" className="text-sm font-medium text-black">Product Interest <span className="text-black/50">(optional)</span></Label>
              <Input id="productInterest" type="text" placeholder="Which product or style are you interested in?" value={formData.productInterest} onChange={handleChange("productInterest")} disabled={status === "loading"} className="w-full bg-offwhite border-border text-black placeholder:text-black/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium text-black">Message <span className="text-terracotta">*</span></Label>
              <Textarea id="message" placeholder="Tell us how we can help you..." rows={5} value={formData.message} onChange={handleChange("message")} disabled={status === "loading"} className={inputCls("message")} />
              {errors.message && <p className="text-xs text-terracotta">{errors.message}</p>}
            </div>
            {errorMessage && <p className="text-sm text-terracotta bg-terracotta/10 px-4 py-3 rounded">{errorMessage}</p>}
            <Button type="submit" disabled={status === "loading"} className="w-full bg-black text-cream hover:bg-emerald disabled:opacity-50">
              {status === "loading" ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Sending...</span>
              ) : (
                <span className="flex items-center gap-2">Send Message <Send className="w-4 h-4" /></span>
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
