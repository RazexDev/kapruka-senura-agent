"use client";

import { AnimatePresence, motion } from "framer-motion";

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const features = [
  {
    icon: "💬",
    title: "Vibe-Driven Multi-Language Chat",
    badge: "AI Powered",
    badgeColor: "amber",
    description:
      "Chat naturally with our AI agent Senura in your preferred language. VibeCart fully supports English, සිංහල (Sinhala), Singlish, and Tanglish — so you can describe your gift vibe the way you feel it.",
    examples: ["\"Thaththa birthday eke okkoma dennam\"", "\"Get something cool for my homebody bestie\""],
  },
  {
    icon: "🧠",
    title: "Intelligent Gift Customization",
    badge: "Context-Aware",
    badgeColor: "blue",
    description:
      "Senura automatically harvests all the gift parameters from your conversation — the relationship (e.g., mother, brother), the occasion (birthday, anniversary, Avurudu), the budget constraints, and the recipient's personality vibe.",
    examples: ["Relationship → Occasion → Budget → Personality", "Auto-fills with smart defaults when you skip details"],
  },
  {
    icon: "🎯",
    title: "Smart Query Extraction",
    badge: "No Generic Mugs",
    badgeColor: "green",
    description:
      "Our custom search layer detects high-intent product keywords in your message — words like \"headphones\", \"electronics\", or \"saree\" — and searches Kapruka directly for those categories, bypassing vague or generic results.",
    examples: ["\"Show me earbuds\" → searches Kapruka for earbuds", "Whole-word matching prevents false category hits"],
  },
  {
    icon: "🛒",
    title: "Multi-Item Gift Bundling",
    badge: "Persistent Cart",
    badgeColor: "purple",
    description:
      "Browse multiple products and add them to a persistent cart — right from the chat stream. Build a custom gift bundle across multiple search sessions without losing your picks.",
    examples: ["Add headphones + chocolates + card in one cart", "Cart persists throughout your session"],
  },
  {
    icon: "📦",
    title: "Logistics-Aware Checkout",
    badge: "Smart Delivery",
    badgeColor: "rose",
    description:
      "VibeCart enforces a strict 24-hour advance notice on your preferred delivery date for realistic local Sri Lankan delivery timelines. Once validated, it safely generates a direct secure checkout redirect to Kapruka.",
    examples: ["Delivery date must be at least 24 hours ahead", "Secure handoff to Kapruka payment gateway"],
  },
];

const badgeStyles: Record<string, string> = {
  amber:  "bg-amber-400/15 text-amber-400 border-amber-400/30",
  blue:   "bg-sky-400/15 text-sky-400 border-sky-400/30",
  green:  "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  purple: "bg-violet-400/15 text-violet-400 border-violet-400/30",
  rose:   "bg-rose-400/15 text-rose-400 border-rose-400/30",
};

const steps = [
  { step: "01", label: "Tell Senura who you're gifting to" },
  { step: "02", label: "Share the occasion & your budget vibe" },
  { step: "03", label: "Browse AI-curated picks from Kapruka" },
  { step: "04", label: "Add items to your bundle cart" },
  { step: "05", label: "Fill in delivery details & go to payment" },
];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="help-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-[#020817]/80 backdrop-blur-md" />

          <motion.div
            key="help-panel"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1e]/90 backdrop-blur-xl shadow-[0_0_80px_rgba(251,191,36,0.08)] scrollbar-hide"
          >
            {/* ── Close button ── */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Close help"
            >
              ✕
            </button>

            <div className="px-6 pt-8 pb-10">

              {/* ── Header ── */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon.png" alt="VibeCart" className="h-9 w-9 rounded-xl object-contain border border-white/10" />
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
                      VIBE CART
                    </h1>
                    <p className="text-[0.65rem] uppercase tracking-widest text-slate-500">Powered by Kapruka &amp; Gemini</p>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
                  VibeCart is an AI-powered gift discovery companion for Sri Lanka.
                  Talk to Senura in your own words — in any language — and she'll find
                  the perfect gift on Kapruka, handle the cart, and guide you to checkout.
                </p>
              </div>

              {/* ── How it works ── */}
              <div className="mb-8">
                <p className="text-[0.65rem] uppercase tracking-widest text-amber-400/80 font-semibold mb-4">How it works</p>
                <div className="flex flex-col gap-2">
                  {steps.map(({ step, label }, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i, duration: 0.2 }}
                      className="flex items-center gap-3"
                    >
                      <span className="flex-shrink-0 h-7 w-7 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-[0.65rem] font-bold text-amber-400">
                        {step}
                      </span>
                      <p className="text-sm text-slate-300">{label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* ── Divider ── */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

              {/* ── Feature cards ── */}
              <div className="mb-2">
                <p className="text-[0.65rem] uppercase tracking-widest text-amber-400/80 font-semibold mb-4">What makes VibeCart different</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {features.map((feat, i) => (
                    <motion.div
                      key={feat.title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 * i + 0.1, duration: 0.25 }}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex flex-col gap-3 hover:border-white/15 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-2xl leading-none">{feat.icon}</span>
                        <span className={`text-[0.6rem] font-semibold uppercase tracking-wider border rounded-full px-2 py-0.5 ${badgeStyles[feat.badgeColor]}`}>
                          {feat.badge}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white mb-1">{feat.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
                      </div>
                      {feat.examples.length > 0 && (
                        <div className="flex flex-col gap-1 mt-auto pt-1 border-t border-white/5">
                          {feat.examples.map((ex) => (
                            <p key={ex} className="text-[0.65rem] text-slate-500 italic">✦ {ex}</p>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[0.65rem] text-slate-600 text-center">
                  VibeCart is an independent demo project. All purchases are processed securely by Kapruka.lk.
                </p>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 rounded-xl bg-amber-400 text-black text-xs font-bold px-4 py-2 hover:opacity-90 transition-opacity"
                >
                  Start gifting ✦
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
