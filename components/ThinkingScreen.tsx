"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const MESSAGES = [
  "Reading between the lines... 🤔",
  "Browsing all of Kapruka for you...",
  "Thinking about what makes them smile 💛",
  "Almost there, nearly found the perfect one...",
  "Putting the final touches on your surprise ✦",
] as const;

const DOT_DELAYS = [0, 0.15, 0.3];

export default function ThinkingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-start w-full">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        {DOT_DELAYS.map((delay) => (
          <motion.span
            key={delay}
            className="h-1.5 w-1.5 rounded-full bg-amber-400/80"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }}
          />
        ))}
      </div>

      <div className="h-6 relative w-full">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-[0.9rem] text-slate-300 absolute left-0"
          >
            {MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
