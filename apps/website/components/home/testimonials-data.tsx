import { Star } from "lucide-react";

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  quote: string;
  gradient: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Adaeze M.",
    location: "London, UK",
    rating: 5,
    quote:
      "The quality is absolutely stunning. I've never felt more confident in an outfit. The emerald bubu set I ordered fits perfectly and the fabric feels luxurious.",
    gradient: "linear-gradient(135deg, #1B4D3E 0%, #C9A84C 100%)",
  },
  {
    id: "2",
    name: "Ngozi K.",
    location: "Berlin, Germany",
    rating: 5,
    quote:
      "Finally, fashion that celebrates African heritage with such elegance. My Laura set always gets compliments everywhere I go. Absolutely love PrintsbyTee!",
    gradient: "linear-gradient(135deg, #C9A84C 0%, #C75B39 100%)",
  },
  {
    id: "3",
    name: "Amara J.",
    location: "Edinburgh, Scotland",
    rating: 5,
    quote:
      "The attention to detail is remarkable. From the packaging to the stitching, everything speaks quality. This is how African fashion should be presented.",
    gradient: "linear-gradient(135deg, #0D0D0D 0%, #1B4D3E 100%)",
  },
  {
    id: "4",
    name: "Fatima A.",
    location: "Stirling, Scotland",
    rating: 5,
    quote:
      "I ordered for my daughter's wedding and the 2-piece set was breathtaking. The rose gold accents were exactly as shown. Will definitely be ordering again!",
    gradient: "linear-gradient(135deg, #C75B39 0%, #F5F0E8 100%)",
  },
];

export function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? "fill-gold text-gold" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}
