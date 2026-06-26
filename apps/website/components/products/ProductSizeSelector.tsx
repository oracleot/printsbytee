"use client";

interface ProductSizeSelectorProps {
  sizes: string[];
  selectedSize: string | null;
  onSelect: (size: string) => void;
}

export function ProductSizeSelector({ sizes, selectedSize, onSelect }: ProductSizeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-black">
        Select Size <span className="text-black/50">(Required)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            type="button"
            key={size}
            onClick={() => onSelect(size)}
            className={`px-4 py-2 text-sm font-medium rounded-md border transition-all ${
              selectedSize === size
                ? "bg-black text-cream border-black"
                : "bg-cream text-black border-border hover:border-gold hover:text-gold"
            }`}
          >
            {size}
          </button>
        ))}
      </div>
      {!selectedSize && (
        <p className="text-xs text-terracotta">Please select a size</p>
      )}
    </div>
  );
}
