"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

type ProductSummary = {
  id: string;
  name: string;
  price: { amount: number | null; currency: string };
  image: string | null;
  url: string;
  matchScore?: number;
};

type Recommendation = {
  bestMatch: ProductSummary & { reason: string };
  alternatives: ProductSummary[];
};

type RevealScreenProps = {
  recommendation: Recommendation;
  recipientName: string;
  occasion: string;
  onAddToCart?: (product: ProductSummary) => void;
};

function formatPrice(price: any): string {
  if (!price) return "Price TBD";
  const amount = typeof price === 'number' ? price : price.amount;
  if (amount == null) return "Price TBD";
  return `Rs. ${Number(amount).toLocaleString()}`;
}

/** Hero product image — isolated imgError state per mount */
function HeroImage({ src, alt }: { src: string | null; alt: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative w-full h-[220px] bg-[#0f1729] overflow-hidden">
      {!imgError && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain p-2"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="text-5xl">🎁</div>
          <p className="text-slate-500 text-xs text-center px-4">Image not available</p>
        </div>
      )}
      {/* Gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0f1729] to-transparent pointer-events-none" />
    </div>
  );
}

/** Alt thumbnail image — isolated imgError state per card */
function AltImage({ src, alt }: { src: string | null; alt: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative h-[100px] w-full bg-[#0a0f1e] overflow-hidden">
      {!imgError && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain p-1"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-3xl">🎁</span>
        </div>
      )}
    </div>
  );
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
        ✦ Vibe Cart's Pick for your {recipientName}
      </p>

      {/* ─── Hero Card ─── */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        whileHover={{ scale: 1.02, boxShadow: "0px 0px 20px 0px rgba(251, 191, 36, 0.15)" }}
        className="rounded-2xl bg-gradient-to-br from-[#0f1729]/90 to-[#1a1040]/90 backdrop-blur-md border border-white/10 hover:border-amber-400/30 overflow-hidden w-full max-w-full transition-colors duration-300 shadow-xl"
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
            {/* Each swap mounts a fresh HeroImage with its own imgError state */}
            <HeroImage src={current.image} alt={current.name} />

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
                <span
                  className={`text-xs font-semibold ${
                    (current.matchScore ?? 85) >= 90
                      ? "text-green-400"
                      : (current.matchScore ?? 85) >= 75
                      ? "text-amber-400"
                      : "text-slate-400"
                  }`}
                >
                  Match: {current.matchScore ?? 85}% ✦
                </span>
              </div>

              <p className="text-xs italic text-slate-400 mt-2 line-clamp-3">
                {currentReason}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ─── CTA Buttons ─── */}
      <div className="mt-3 w-full max-w-full flex gap-2">
        <motion.button
          type="button"
          onClick={() => {
            if (onAddToCart) {
              onAddToCart(current);
              setIsAdded(true);
              setTimeout(() => setIsAdded(false), 2000);
            } else {
              window.open(current.url, '_blank');
            }
          }}
          whileTap={{ scale: 0.97 }}
          className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
            isAdded ? 'bg-green-500 text-white' : 'bg-amber-400 text-black hover:opacity-90'
          }`}
        >
          {onAddToCart ? (
            isAdded ? (
              <>Added! ✓</>
            ) : (
              <>Add to Cart <span className="text-lg leading-none">🛒</span></>
            )
          ) : (
            "View & Order on Kapruka →"
          )}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          title="Copy gift message"
          className="flex-shrink-0 rounded-xl px-3 py-3 border border-white/10 bg-white/5 hover:border-amber-400/30 transition-all"
        >
          {copied ? (
            <span className="text-emerald-400 text-sm">✓</span>
          ) : (
            <span className="text-slate-400 text-sm">📋</span>
          )}
        </motion.button>
      </div>

      {/* ─── Alternatives Section ─── */}
      {alts.length > 0 && (
        <div className="mt-4 max-w-full">
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
                className="min-w-[110px] max-w-[110px] flex-shrink-0 bg-[#0a0f1e] rounded-xl border border-white/10 overflow-hidden cursor-pointer hover:border-amber-400/40 transition-all text-left"
              >
                {/* Each alt has its own AltImage — isolated error state */}
                <AltImage src={alt.image} alt={alt.name} />
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
