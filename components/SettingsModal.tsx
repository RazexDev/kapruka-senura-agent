"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { setVoiceEnabled as setGlobalVoiceEnabled } from './VoicePlayer';
import { useState } from 'react';

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
  onLanguageSelect: (lang: string) => void;
};

const LANGUAGES = [
  { id: 'english', icon: '🇬🇧', label: 'English', desc: 'Conversational English' },
  { id: 'sinhala', icon: '🇱🇰', label: 'සිංහල', desc: 'Sinhala Script' },
  { id: 'singlish', icon: '💬', label: 'Singlish', desc: 'Sinhala-English blend' },
  { id: 'tanglish', icon: '🖎', label: 'Tanglish', desc: 'Tamil-English blend' },
];

export default function SettingsModal({ isOpen, onClose, currentLanguage, onLanguageSelect }: SettingsModalProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const toggleVoice = () => {
    const newVal = !voiceEnabled;
    setVoiceEnabled(newVal);
    setGlobalVoiceEnabled(newVal);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#020817]/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <button 
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all -mr-2"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Voice Engine</h3>
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div>
                  <div className="text-white font-medium">Text-to-Speech</div>
                  <div className="text-slate-500 text-xs mt-0.5">Senura will speak out loud</div>
                </div>
                <button 
                  onClick={toggleVoice}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${voiceEnabled ? 'bg-amber-400' : 'bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${voiceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Language Preference</h3>
              <div className="grid gap-3">
                {LANGUAGES.map(lang => {
                  const isActive = currentLanguage === lang.id;
                  return (
                    <button
                      key={lang.id}
                      onClick={() => {
                        onLanguageSelect(lang.id);
                        onClose();
                      }}
                      className={`flex items-center p-4 rounded-2xl border transition-all ${
                        isActive 
                          ? 'bg-amber-400/10 border-amber-400/50' 
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="text-2xl mr-4">{lang.icon}</span>
                      <div className="flex-1 text-left">
                        <h4 className={`font-bold ${isActive ? 'text-amber-400' : 'text-white'}`}>{lang.label}</h4>
                        <p className={`text-xs ${isActive ? 'text-amber-400/70' : 'text-slate-500'}`}>{lang.desc}</p>
                      </div>
                      {isActive && (
                        <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                          <span className="text-[#020817] text-xs font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
