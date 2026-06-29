"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function ThinkingScreen() {
  const [stage, setStage] = useState<1 | 2>(1);

  useEffect(() => {
    const t = setTimeout(() => setStage(2), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bg-white/5 border border-white/10 text-slate-200 rounded-2xl px-4 py-3 backdrop-blur w-max flex items-center gap-2 text-sm italic">
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="text-amber-400"
      >
        ✦
      </motion.div>
      <div className="relative overflow-hidden w-[260px] h-5">
        <AnimatePresence mode="wait">
          <motion.span
            key={stage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="absolute left-0"
          >
            {stage === 1 ? "Reading what you need..." : "Searching Kapruka for the perfect match..."}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
