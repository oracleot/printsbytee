import { HeroSection } from "@/components/home/HeroSection";
import { StickyScrollReveal } from "@/components/home/StickyScrollReveal";

// Force dynamic rendering to avoid build-time API dependency
export const dynamic = 'force-dynamic';
import { BentoGrid } from "@/components/home/BentoGrid";
import { AnimatedTestimonials } from "@/components/home/AnimatedTestimonials";
import { PatternDivider } from "@/components/shared/PatternDivider";
// NewsletterForm hidden until API integration is complete
// import { NewsletterForm } from "@/components/home/NewsletterForm";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { getFeaturedProducts } from "@/lib/api-client";

export default async function HomePage() {
  // Fetch featured products from API
  const featuredProducts = await getFeaturedProducts();

  return (
    <>
      <HeroSection />
      <BentoGrid products={featuredProducts} />
      <StickyScrollReveal />
      <AnimatedTestimonials />
      <PatternDivider />
      {/* <NewsletterForm /> — hidden until API integration is complete */}
      <WhatsAppButton />
    </>
  );
}