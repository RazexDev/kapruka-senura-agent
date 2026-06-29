"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export type Product = {
  id: string;
  name: string;
  price: { amount: number | null; currency: string };
  image: string | null;
  url: string;
  matchScore?: number;
};

type BrowseResultsCardProps = {
  products: Product[];
  category: string;
  totalFound: number;
  onProductSelect: (product: Product) => void;
};

function formatPrice(price: any): string {
  if (!price) return "Price TBD";
  const amount = typeof price === 'number' ? price : price.amount;
  if (amount == null) return "Price TBD";
  return `Rs. ${Number(amount).toLocaleString()}`;
}

export default function BrowseResultsCard({
  products,
  category,
  totalFound,
  onProductSelect,
}: BrowseResultsCardProps) {
  const [visibleCount, setVisibleCount] = useState(6);

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 4, products.length, 12));
  };

  const visibleProducts = products.slice(0, visibleCount);
  const canShowMore = visibleCount < products.length && visibleCount < 12;
  const remaining = Math.min(4, products.length - visibleCount, 12 - visibleCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[340px] sm:max-w-sm mt-2"
    >
      {/* Header */}
      <div className="mb-3">
        <p className="text-amber-400 text-xs uppercase tracking-widest font-semibold">
          ✦ {totalFound} results for "{category}"
        </p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3">
        {visibleProducts.map((product, index) => (
          <div
            key={`${product.id ?? product.name}-${index}`}
            onClick={() => onProductSelect(product)}
            className="bg-[#0f1729] rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-amber-400/40 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] flex flex-col"
          >
            {/* Image */}
            <div className="h-[120px] bg-[#0a0f1e] relative">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain p-2"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.classList.remove("hidden");
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-3xl">
                  🎁
                </div>
              )}
              <div className="hidden absolute inset-0 flex items-center justify-center text-3xl">
                🎁
              </div>
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col flex-grow justify-between">
              <p className="text-white text-xs font-medium line-clamp-2 leading-snug mb-2">
                {product.name}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-amber-400 text-xs font-semibold">
                  {formatPrice(product.price)}
                </span>
                {product.matchScore && (
                  <span className="text-slate-500 text-[10px]">
                    {product.matchScore}% ✦
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show more button */}
      {canShowMore && (
        <button
          onClick={handleShowMore}
          className="mt-3 w-full text-center text-slate-400 text-xs py-2.5 border border-white/10 rounded-xl hover:border-amber-400/30 hover:text-amber-400 transition-all bg-white/5 font-medium"
        >
          View {remaining} more results →
        </button>
      )}
    </motion.div>
  );
}
