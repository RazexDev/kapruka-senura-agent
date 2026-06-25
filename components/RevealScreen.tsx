"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { fireConfetti } from "./Confetti";

type ProductSummary = {
  name: string;
  price: { amount: number | null; currency: string };
  image: string | null;
  url: string;
};

type Recommendation = {
  bestMatch: ProductSummary & { reason: string };
  alternatives: ProductSummary[];
};

type RevealScreenProps = {
  recommendation: Recommendation;
  recipientName: string;
  occasion: string;
  onAddToCart: (product: ProductSummary & { reason?: string }) => void;
};

function formatPrice(price: { amount: number | null; currency: string }): string {
  if (price.amount == null) return "Price TBD";
  return `Rs. ${price.amount.toLocaleString()}`;
}

export default function RevealScreen({
  recommendation,
  recipientName,
  occasion,
  onAddToCart,
}: RevealScreenProps) {
  const [current, setCurrent] = useState<ProductSummary & { reason?: string }>(
    recommendation.bestMatch,
  );
  const [alts, setAlts] = useState<Array<ProductSummary & { reason?: string }>>(
    recommendation.alternatives,
  );
  const [copied, setCopied] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const currentReason = current.reason || recommendation.bestMatch.reason;
  const giftMessage = `Hey! Got you the "${current.name}" for your ${recipientName.toLowerCase()}'s ${occasion.toLowerCase()}. ${currentReason.split(",")[0]}. Picked this especially for you — hope it makes your day extra special! 💛`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(giftMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwap = (alt: ProductSummary & { reason?: string }) => {
    setAlts((prev) => [...prev.filter((a) => a.name !== alt.name), current]);
    setCurrent(alt);
  };

  return (
    <div className="w-full flex flex-col">
      <p className="text-amber-400 text-[0.7rem] uppercase tracking-widest mb-2 font-bold">
        ✦ Senura's Pick for your {recipientName}
      </p>
      
      {/* ─── Hero Card ─── */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        whileHover={{ scale: 1.02, boxShadow: "0px 0px 20px 0px rgba(251, 191, 36, 0.15)" }}
        className="rounded-2xl bg-gradient-to-br from-[#0f1729]/90 to-[#1a1040]/90 backdrop-blur-md border border-white/10 hover:border-amber-400/30 overflow-hidden w-full max-w-[320px] sm:max-w-sm transition-colors duration-300 shadow-xl"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col w-full"
          >
            {/* Product Image */}
            <div className="w-full aspect-[4/3] overflow-hidden relative bg-[#0f0f0f]">
              {current.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.image}
                  alt={current.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-[#1a1040]" />
              )}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0f1729]/95 to-transparent pointer-events-none" />
            </div>

            {/* Card Info */}
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <h1 className="font-display text-base font-bold text-white leading-snug flex-1 line-clamp-2">
                  {current.name}
                </h1>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="shrink-0 rounded-full bg-amber-400/20 border border-amber-400/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  {formatPrice(current.price)}
                </span>
                <span className="text-xs text-amber-400/80">Match: 97% ✦</span>
              </div>

              <p className="text-xs italic text-slate-400 mt-2 line-clamp-3">
                {currentReason}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ─── CTA Button ─── */}
      <motion.button
        type="button"
        disabled={isAdded}
        onClick={() => {
          fireConfetti();
          onAddToCart(current);
          setIsAdded(true);
          setTimeout(() => setIsAdded(false), 2200);
        }}
        animate={isAdded ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}
        className={`mt-3 w-full max-w-[320px] sm:max-w-sm rounded-xl py-3 text-sm font-bold transition-all duration-300 ${
          isAdded
            ? "bg-emerald-500 text-white"
            : "bg-amber-400 text-black hover:opacity-90"
        }`}
      >
        {isAdded ? "✓ Added to Cart!" : `Add to Cart — ${formatPrice(current.price)}`}
      </motion.button>

      {/* ─── Alternatives Section ─── */}
      {alts.length > 0 && (
        <div className="mt-4 max-w-[320px] sm:max-w-sm">
          <p className="text-[0.7rem] uppercase tracking-widest text-slate-400 mb-2">
            Other ideas for {recipientName}
          </p>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {alts.map((alt, index) => (
              <motion.button
                key={`${alt.name}-${index}`}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSwap(alt)}
                className="min-w-[120px] max-w-[120px] flex-shrink-0 bg-[#0f1729] rounded-xl border border-white/10 overflow-hidden cursor-pointer hover:border-amber-400/40 transition-all text-left"
              >
                <div className="relative h-[80px] w-full overflow-hidden">
                  {alt.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={alt.image}
                      alt={alt.name}
                      className="h-full w-full object-contain bg-[#0f0f0f]"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900" />
                  )}
                </div>
                <p className="text-[0.65rem] text-white truncate px-2 pt-1.5">
                  {alt.name}
                </p>
                <p className="text-[0.65rem] text-amber-400 px-2 pb-1.5">
                  {formatPrice(alt.price)}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
