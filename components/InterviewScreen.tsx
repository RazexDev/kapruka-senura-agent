"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";

export type InterviewProfile = {
  relationship: string;
  personality: string;
  occasion: string;
  budget: string;
};

type InterviewScreenProps = {
  relationship: string;
  onComplete: (profile: InterviewProfile) => void;
};

type QuestionOption = {
  label: string;
  emoji?: string;
};

type Question = {
  text: string;
  options: QuestionOption[];
};

const QUESTIONS: Question[] = [
  {
    text: "What's their vibe?",
    options: [
      { label: "Homebody", emoji: "🏡" },
      { label: "Foodie", emoji: "🍛" },
      { label: "Trendsetter", emoji: "✨" },
      { label: "Traditionalist", emoji: "🪔" },
      { label: "Adventurer", emoji: "🌿" },
    ],
  },
  {
    text: "What's the occasion?",
    options: [
      { label: "Birthday", emoji: "🎂" },
      { label: "Avurudu", emoji: "🌸" },
      { label: "Anniversary", emoji: "💛" },
      { label: "Just Because", emoji: "🎁" },
      { label: "Achievement", emoji: "🏆" },
    ],
  },
  {
    text: "Your budget?",
    options: [
      { label: "Under Rs. 2,000" },
      { label: "Rs. 2,000–5,000" },
      { label: "Rs. 5,000–15,000" },
      { label: "Go all out 💎" },
    ],
  },
];

const PROGRESS_WIDTH = ["w-1/3", "w-2/3", "w-full"] as const;

export default function InterviewScreen({
  relationship,
  onComplete,
}: InterviewScreenProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{
    personality?: string;
    occasion?: string;
    budget?: string;
  }>({});
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = QUESTIONS[currentQ];

  const handleSelect = useCallback(
    (answer: string) => {
      if (selectedLabel !== null) return; // prevent double-tap

      setSelectedLabel(answer);

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        setSelectedLabel(null);

        if (currentQ === 0) {
          setAnswers((prev) => ({ ...prev, personality: answer }));
          setCurrentQ(1);
          return;
        }

        if (currentQ === 1) {
          setAnswers((prev) => ({ ...prev, occasion: answer }));
          setCurrentQ(2);
          return;
        }

        onComplete({
          relationship,
          personality: answers.personality ?? "",
          occasion: answers.occasion ?? "",
          budget: answer,
        });
      }, 200);
    },
    [selectedLabel, currentQ, answers, relationship, onComplete],
  );

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center bg-[#020817] px-6">
      {/* ─── Progress Bar ─── */}
      <div className="absolute left-0 top-0 h-1 w-full bg-white/10">
        <div
          className={`h-full bg-amber-400 transition-all duration-500 ${PROGRESS_WIDTH[currentQ]}`}
          style={{ boxShadow: "0 0 8px #f59e0b" }}
        />
      </div>

      <div className="flex w-full max-w-5xl flex-col items-center text-center">
        <p className="mb-4 text-[0.75rem] uppercase tracking-widest text-amber-400">
          For your {relationship}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-full flex-col items-center"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-black shadow-sm">
                S
              </div>
              <div className="relative rounded-2xl rounded-tl-none bg-white/10 px-4 py-2 text-xs italic text-slate-400 backdrop-blur border border-white/5">
                {currentQ === 0 && "This helps me understand what they'd actually use"}
                {currentQ === 1 && "Every occasion calls for a different kind of gift"}
                {currentQ === 2 && "I'll find the best within your range, promise ✦"}
              </div>
            </div>
            <h2 className="font-display mb-10 text-[2.5rem] leading-tight text-white">
              {question.text}
            </h2>

            <div className="flex flex-wrap justify-center gap-4">
              {question.options.map((option) => {
                const isSelected = selectedLabel === option.label;

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleSelect(option.label)}
                    className={`flex min-w-[140px] cursor-pointer flex-col items-center rounded-2xl border px-5 py-6 backdrop-blur transition-all duration-200 ${
                      isSelected
                        ? "scale-95 border-amber-400 bg-amber-400/20"
                        : "border-white/10 bg-white/5 hover:scale-105 hover:border-amber-400/60 hover:bg-amber-400/10"
                    }`}
                  >
                    {option.emoji ? (
                      <span className="text-[2.5rem] leading-none">
                        {option.emoji}
                      </span>
                    ) : null}
                    <span
                      className={`text-[0.9rem] text-white ${option.emoji ? "mt-2" : ""}`}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
