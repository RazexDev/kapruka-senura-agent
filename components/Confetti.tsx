"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  duration: number;
};

const COLORS = ["#f59e0b", "#fbbf24", "#fcd34d", "#6366f1", "#ffffff"]; // amber, indigo, white

export function fireConfetti() {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("fire-confetti");
    window.dispatchEvent(event);
  }
}

export default function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const handleFire = () => {
      const newParticles: Particle[] = Array.from({ length: 60 }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100, // starting vh percentage
        y: Math.random() * 20 + 80, // start near bottom
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 6 + 4,
        rotation: Math.random() * 360,
        duration: Math.random() * 1.5 + 1.5,
      }));

      setParticles((prev) => [...prev, ...newParticles]);

      // Cleanup particles after animation
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
      }, 3000);
    };

    window.addEventListener("fire-confetti", handleFire);
    return () => window.removeEventListener("fire-confetti", handleFire);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: 1, 
              x: `${p.x}vw`, 
              y: "100vh", 
              rotate: 0,
              scale: 0 
            }}
            animate={{ 
              opacity: [1, 1, 0],
              x: [`${p.x}vw`, `${p.x + (Math.random() * 20 - 10)}vw`],
              y: ["100vh", `${Math.random() * 30 + 10}vh`, "100vh"],
              rotate: p.rotation + 360,
              scale: 1 
            }}
            transition={{ 
              duration: p.duration, 
              ease: "easeOut",
              times: [0, 0.4, 1] 
            }}
            className="absolute rounded-sm"
            style={{
              width: p.size,
              height: p.size * 1.5,
              backgroundColor: p.color,
              boxShadow: `0 0 8px ${p.color}80`
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
