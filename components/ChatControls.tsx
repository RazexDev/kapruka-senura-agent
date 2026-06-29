"use client";
import { useState } from 'react';
import { setVoiceEnabled as setGlobalVoiceEnabled } from './VoicePlayer';

export default function ChatControls({ onLanguageChange }: { onLanguageChange: (l: string) => void }) {
  const [lang, setLang] = useState('en');
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'si' : 'en';
    setLang(newLang);
    onLanguageChange(newLang);
  };

  const toggleVoice = () => {
    const newVal = !voiceEnabled;
    setVoiceEnabled(newVal);
    setGlobalVoiceEnabled(newVal);
  };

  return (
    <div className="flex gap-4 p-2 bg-gray-900 rounded-lg text-white">
      <button onClick={toggleVoice}>
        {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
      </button>
      <button onClick={toggleLang} className="underline">
        Switch to {lang === 'en' ? 'Sinhala' : 'English'}
      </button>
    </div>
  );
}
