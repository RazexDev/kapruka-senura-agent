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
  intent?: string;
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
  intent,
  onProductSelect,
}: BrowseResultsCardProps) {
  const [visibleCount, setVisibleCount] = useState(6);

  const shouldShowProducts = intent !== 'chitchat' && products && products.length > 0;

  if (!shouldShowProducts) {
    return null; // Return nothing if we are just chatting or have no products
  }

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
      className="w-full mt-2"
    >
      {/* Header */}
      <div className="mb-3">
        <p className="text-amber-400 text-xs uppercase tracking-widest font-semibold">
          ✦ {totalFound} results for "{category}"
        </p>
      </div>

      {/* Product Grid / Carousel */}
      <div 
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 gap-3 pb-2 overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {visibleProducts.map((product, index) => (
          <div
            key={`${product.id ?? product.name}-${index}`}
            onClick={() => onProductSelect(product)}
            className="flex-shrink-0 snap-center min-w-[240px] w-[75vw] md:min-w-0 md:w-auto bg-[#0f1729] rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-amber-400/40 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] flex flex-col"
          >
            {/* Image */}
            <div className="aspect-square w-full h-auto bg-slate-800/50 animate-pulse relative">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain p-2 absolute inset-0 transition-opacity duration-300 opacity-0"
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    el.classList.remove('opacity-0');
                    if (el.parentElement) el.parentElement.classList.remove('animate-pulse', 'bg-slate-800/50');
                    if (el.parentElement) el.parentElement.classList.add('bg-[#0a0f1e]');
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.classList.remove("hidden");
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-5xl bg-[#0a0f1e]">
                  🎁
                </div>
              )}
              <div className="hidden absolute inset-0 flex items-center justify-center text-5xl bg-[#0a0f1e]">
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
