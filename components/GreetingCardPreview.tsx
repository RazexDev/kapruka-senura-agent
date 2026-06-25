"use client";

import { motion } from "framer-motion";

type GreetingCardPreviewProps = {
  sender: string;
  recipient: string;
  message: string;
};

export default function GreetingCardPreview({ sender, recipient, message }: GreetingCardPreviewProps) {
  if (!sender && !recipient && !message) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
      className="relative w-full rounded-2xl overflow-hidden bg-[#faf8f5] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
    >
      {/* Texture / Noise Overlay */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      {/* Gold Border */}
      <div className="absolute inset-2 border border-amber-400/40 rounded-xl pointer-events-none" />
      <div className="absolute inset-2.5 border border-amber-400/20 rounded-lg pointer-events-none" />

      {/* Wax Seal */}
      <div className="absolute -top-3 -right-3 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border border-amber-600/50" style={{ transform: "rotate(15deg)" }}>
        <div className="w-10 h-10 border border-amber-400/50 rounded-full flex items-center justify-center">
          <span className="text-amber-100 text-lg">✦</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center pt-2 pb-1">
        <p className="font-display text-amber-600 text-sm italic mb-3">A Gift For You</p>
        
        <p className="font-display text-2xl text-slate-800 leading-tight mb-4 min-h-[1.5rem]">
          {recipient || "Someone Special"}
        </p>

        <p className="font-display text-sm text-slate-600 leading-relaxed italic mb-4 min-h-[2rem] whitespace-pre-wrap px-2">
          {message || "Wishing you all the best!"}
        </p>

        <div className="w-8 h-[1px] bg-amber-400/40 mb-3" />

        <p className="font-display text-xs text-slate-500 uppercase tracking-widest">
          From, <span className="font-bold text-slate-800 normal-case italic text-sm">{sender || "Me"}</span>
        </p>
      </div>
    </motion.div>
  );
}
