"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getCategoryLabel, getSizeChart, type Product } from "@/lib/products";

interface ProductAccordionProps {
  category: Product["category"];
}

export function ProductAccordion({ category }: ProductAccordionProps) {
  const chart = getSizeChart(category);

  return (
    <Accordion className="w-full">
      <AccordionItem value="product-details">
        <AccordionTrigger className="text-sm font-medium">Product Details</AccordionTrigger>
        <AccordionContent className="text-sm text-black/70 space-y-2">
          <p><strong>Category:</strong> {getCategoryLabel(category)}</p>
          <p><strong>Material:</strong> Premium African print fabric with cotton blend</p>
          <p><strong>Closure:</strong> Zip and button fastening</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="sizing-guide">
        <AccordionTrigger className="text-sm font-medium">Sizing Guide</AccordionTrigger>
        <AccordionContent className="text-sm text-black/70 space-y-3">
          {chart ? (
            <>
              <p className="text-xs text-black/60 italic">{chart.description}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1.5 pr-3 text-left font-semibold">Size</th>
                      <th className="py-1.5 text-left font-semibold">UK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.measurements.map((row) => (
                      <tr key={row.size} className="border-b border-border/40">
                        <td className="py-2 pr-3 font-semibold">{row.size}</td>
                        <td className="py-2">{row.uk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gold font-medium">{chart.notes}</p>
            </>
          ) : (
            <p className="text-xs text-black/50">Size guide not available for this category.</p>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="care-instructions">
        <AccordionTrigger className="text-sm font-medium">Care Instructions</AccordionTrigger>
        <AccordionContent className="text-sm text-black/70 space-y-2">
          <p><strong>Washing:</strong> Machine wash cold on delicate cycle</p>
          <p><strong>Drying:</strong> Hang to dry, avoid direct sunlight</p>
          <p><strong>Ironing:</strong> Low heat on reverse side</p>
          <p><strong>Storage:</strong> Hang or fold neatly in a cool, dry place</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}