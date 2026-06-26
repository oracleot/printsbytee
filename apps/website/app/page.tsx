import { HeroSection } from "@/components/home/HeroSection";
import { StickyScrollReveal } from "@/components/home/StickyScrollReveal";
import { BentoGrid } from "@/components/home/BentoGrid";
import { AnimatedTestimonials } from "@/components/home/AnimatedTestimonials";
import { PatternDivider } from "@/components/shared/PatternDivider";
// NewsletterForm hidden until API integration is complete
// import { NewsletterForm } from "@/components/home/NewsletterForm";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { products as allProducts } from "@/lib/data";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <BentoGrid products={allProducts} />
      <StickyScrollReveal />
      <AnimatedTestimonials />
      <PatternDivider />
      {/* <NewsletterForm /> — hidden until API integration is complete */}
      <WhatsAppButton />
    </>
  );
}
