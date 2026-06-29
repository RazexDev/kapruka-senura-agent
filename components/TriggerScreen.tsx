"use client";

import { motion } from "framer-motion";

type TriggerScreenProps = {
  onSelect: (relationship: string) => void;
};

const CARDS = [
  { label: "Amma", emoji: "🧡" },
  { label: "Thaththa", emoji: "💙" },
  { label: "Partner", emoji: "💛" },
  { label: "Best Friend", emoji: "💚" },
  { label: "Boss", emoji: "🤝" },
  { label: "Teacher", emoji: "📚" },
  { label: "Yourself", emoji: "🌟" },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function TriggerScreen({ onSelect }: TriggerScreenProps) {
  return (
    <div className="flex flex-col w-full">
      <p className="text-slate-200 mb-4 text-[0.95rem]">
        Who are you celebrating today? <br/>
        <span className="text-slate-400 text-sm mt-1 block">
          Hi, I'm Vibe Cart ✦ Tell me about them and I'll find the perfect gift — no browsing required.
        </span>
      </p>

      <motion.div
        className="flex flex-wrap gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {CARDS.map((card) => (
          <motion.button
            key={card.label}
            type="button"
            variants={cardVariants}
            onClick={() => onSelect(card.label)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur transition-all duration-200 hover:border-amber-400/60 hover:bg-amber-400/10 cursor-pointer"
          >
            <span className="text-lg">{card.emoji}</span>
            <span className="text-sm text-white">{card.label}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
