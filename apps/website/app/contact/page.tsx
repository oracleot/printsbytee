import { Suspense } from "react";
import { PatternDivider } from "@/components/shared/PatternDivider";
import { ContactHero } from "@/components/contact/ContactHero";
import { ContactInfo } from "@/components/contact/ContactInfo";
import { ContactForm } from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-offwhite" />}>
      <ContactHero />

      <section className="py-16 bg-offwhite">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <ContactInfo />
            <ContactForm />
          </div>
        </div>
      </section>

      <PatternDivider />
    </Suspense>
  );
}
