import { Metadata } from "next";
import { ProductGrid } from "@/components/products/ProductGrid";
import { PatternDivider } from "@/components/shared/PatternDivider";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { products } from "@/lib/data";

export const metadata: Metadata = {
  title: "Our Collection — PrintsbyTee",
  description: "Explore our collection of premium African print fashion. Lora Sets, Aso Oke Kimonos, Fringe Bubus, and Naya Jump Suites for bold and beautiful women.",
};

export default function ProductsPage() {
  return (
    <>
      {/* Hero Header */}
      <section className="pt-32 pb-12 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-gold text-sm tracking-[0.2em] uppercase font-medium">
            Ready-to-Wear
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-black mt-4 mb-6">
            Our Collection
          </h1>
          <p className="text-black/70 text-lg max-w-2xl mx-auto">
            Each piece tells a story of craftsmanship, culture, and the vibrant women who inspire us. 
            Discover your next favorite outfit.
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 bg-offwhite">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProductGrid products={products} />
        </div>
      </section>

      <PatternDivider />
      <WhatsAppButton />
    </>
  );
}