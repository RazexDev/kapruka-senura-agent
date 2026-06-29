"use client";

import CheckoutScreen from "@/components/CheckoutScreen";
import RevealScreen from "@/components/RevealScreen";
import BrowseResultsCard from "@/components/BrowseResultsCard";
import ThinkingScreen from "@/components/ThinkingScreen";
import HelpModal from "@/components/HelpModal";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type MessageType = 'text' | 'thinking' | 'reveal' | 'checkout' | 'browse_results' | 'chips';

type Message = {
  id: string;
  role: 'user' | 'senura';
  type: MessageType;
  content?: string;
  data?: any;
};

type CartItem = {
  id: string;
  name: string;
  price: { amount: number | null; currency: string };
  image: string | null;
  url: string;
  quantity: number;
};

const LOCALIZED_QUICK_REPLIES: Record<string, string[]> = {
  english: [
    "Amma", "Thaththa", "Partner", "Best Friend",
    "Birthday 🎂", "Anniversary 💛", "Avurudu 🌸",
    "Homebody 🏡", "Foodie 🍛", "Trendsetter ✨",
    "Under Rs. 2,000", "Rs. 2,000–5,000", "Go all out 💎"
  ],
  sinhala: [
    "අම්මා", "තාත්තා", "සහකරු/සහකාරිය", "හොඳම යාළුවා",
    "උපන්දිනයක් 🎂", "සංවත්සරයක් 💛", "අවුරුදු 🌸",
    "ගෙදරට කැමති 🏡", "කෑමට කැමති 🍛", "විලාසිතා 🎨",
    "රු. 2,000ට අඩු", "රු. 2,000–5,000", "උපරිම මිලට 💎"
  ],
  singlish: [
    "Amma", "Thaththa", "Partner", "Best Friend",
    "Birthday 🎂", "Anniversary 💛", "Avurudu 🌸",
    "Homebody 🏡", "Foodie 🍛", "Trendsetter ✨",
    "Rs. 2,000 ta adu", "Rs. 2,000–5,000", "Go all out 💎"
  ],
  tanglish: [
    "Amma", "Appa", "Partner", "Best Friend",
    "Birthday 🎂", "Anniversary 💛", "Avurudu 🌸",
    "Homebody 🏡", "Foodie 🍛", "Trendsetter ✨",
    "Rs. 2,000 kku kuraivaha", "Rs. 2,000–5,000", "Go all out 💎"
  ]
};

const LOCALIZED_GREETINGS: Record<string, string> = {
  english: "Hi, I'm Vibe Cart ✦ Tell me about who you're gifting to and I'll find the perfect match!",
  sinhala: "ආයුබෝවන්! මම Vibe Cart ✦ ඔයා තෑග්ගක් දෙන්න හිතන් ඉන්නේ කාටද කියලා මට කියන්න, මම ගැලපෙනම එක හොයලා දෙන්නම්!",
  singlish: "Ayubowan! Mama Vibe Cart ✦ Oyata kaatada gift ekak denna one? Kiyanna, mama hodama eka hoyala dennam!",
  tanglish: "Vannakkam! Naan Vibe Cart ✦ Ungalukku yaarkku gift panna venum? Sollunga, naan best gift kandupidichu tharen!"
};

function ChatBubble({ role, children, hint, noBubble }: { role: 'user'|'senura', children: React.ReactNode, hint?: string, noBubble?: boolean }) {
  const isUser = role === 'user';
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 mr-2 mt-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0f1e] overflow-hidden shadow-sm border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="Vibe Cart" className="h-full w-full object-cover" />
          </div>
        </div>
      )}
      <div className="flex flex-col max-w-[85%]">
        {hint && (
          <div className="mb-2 w-max rounded-2xl rounded-tl-none bg-white/10 px-3 py-2 text-[0.7rem] italic text-slate-400 backdrop-blur border border-white/5 shadow-sm">
            {hint}
          </div>
        )}
        <div className={`${noBubble ? '' : (isUser ? 'bg-amber-400/10 border border-amber-400/30 text-amber-50 rounded-2xl rounded-tr-sm px-3 py-2.5' : 'bg-white/5 border border-white/10 text-slate-200 rounded-2xl rounded-tl-sm px-3 py-2.5')} backdrop-blur`}>
          {children}
        </div>
      </div>
    </motion.div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const [inputValue, setInputValue] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [finalProfile, setFinalProfile] = useState<any>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleClearChat = () => {
    setMessages([]);
    setConversationHistory([]);
    setCart([]);
    setFinalProfile({});
    localStorage.removeItem('senura_messages');
    localStorage.removeItem('senura_history');
    localStorage.removeItem('senura_cart');
    localStorage.removeItem('senura_profile');
  };

  const scrollToTop = () => {
    chatContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    setShowScrollTop(el.scrollTop > 200);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior,
      block: 'end' 
    });
  };

  useEffect(() => {
    scrollToBottom('instant');
  }, []);

  useEffect(() => {
    const savedMessages = localStorage.getItem('senura_messages');
    const savedHistory = localStorage.getItem('senura_history');
    const savedLanguage = localStorage.getItem('senura_language');
    const savedCart = localStorage.getItem('senura_cart');
    const savedProfile = localStorage.getItem('senura_profile');

    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedHistory) setConversationHistory(JSON.parse(savedHistory));
    if (savedLanguage) setPreferredLanguage(savedLanguage);
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedProfile) setFinalProfile(JSON.parse(savedProfile));
    
    setIsLoaded(true);

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2800); // show splash screen for 2.8 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('senura_messages', JSON.stringify(messages));
    localStorage.setItem('senura_history', JSON.stringify(conversationHistory));
    localStorage.setItem('senura_language', preferredLanguage);
    localStorage.setItem('senura_cart', JSON.stringify(cart));
    localStorage.setItem('senura_profile', JSON.stringify(finalProfile));
  }, [messages, conversationHistory, preferredLanguage, cart, finalProfile, isLoaded]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessageToLLM = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString() + '-u', role: 'user', type: 'text', content: text };
    
    setMessages(prev => [...prev, userMsg]);
    setConversationHistory(prev => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: conversationHistory, message: text, preferredLanguage }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      
      const aiMsg: Message = { id: Date.now().toString() + '-s', role: 'senura', type: 'text', content: data.naturalReply || data.message };
      setMessages(prev => [...prev, aiMsg]);

      if (data.intent === "browse" || data.intent === "gift" || data.searchQuery) {
        if (data.intent === "gift" && data.extractedParameters) {
          setFinalProfile(data.extractedParameters);
        }
        setMessages(prev => [...prev, { id: Date.now().toString() + '-t', role: 'senura', type: 'thinking' }]);
        void fetchRecommendation(text, [...conversationHistory, { role: 'user', content: text }]);
      } else {
        setConversationHistory(prev => [...prev, { role: 'assistant', content: data.naturalReply || data.message }]);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now().toString() + '-err', role: 'senura', type: 'text', content: "Oops, something went wrong connecting to my brain. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const fetchRecommendation = async (userMessage: string, history: any[]) => {
    try {
      const response = await fetch("/api/kapruka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage,
          conversationHistory: history
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "no_products_found") {
          setMessages(prev => {
            const filtered = prev.filter(m => m.type !== 'thinking');
            return [...filtered, { id: Date.now().toString(), role: 'senura', type: 'text', content: "I couldn't find exactly that, but how about I search for something similar?" }];
          });
          return;
        }
        throw new Error("Failed");
      }

      if (data.mode === 'browse') {
        setMessages(prev => {
          const filtered = prev.filter(m => m.type !== 'thinking');
          const introMsg: Message = { id: Date.now().toString() + '-intro', role: 'senura', type: 'text', content: data.products.length > 0 ? `Found ${data.totalFound} results for "${data.category}" on Kapruka! Tap any to see details ✦` : data.emptyMessage };
          const browseMsg: Message | null = data.products.length > 0 ? { id: Date.now().toString() + '-browse', role: 'senura', type: 'browse_results', data } : null;
          return browseMsg ? [...filtered, introMsg, browseMsg] : [...filtered, introMsg];
        });
        setConversationHistory(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: `I showed the user ${data.totalFound} products for "${data.category}".`
          }
        ]);
        return;
      }

      setMessages(prev => {
        const filtered = prev.filter(m => m.type !== 'thinking');
        return [...filtered, { id: Date.now().toString(), role: 'senura', type: 'reveal', data }];
      });
      
      setConversationHistory(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: `I found "${data.bestMatch.name}" (Rs. ${data.bestMatch.price.amount}) for the user. They are shopping for: ${data.relationship}, occasion: ${finalProfile?.occasion ?? 'unspecified'}, previous search terms used: ${data.searchTermsUsed?.join(', ') ?? 'unknown'}.`
        }
      ]);
    } catch {
      setMessages(prev => {
        const filtered = prev.filter(m => m.type !== 'thinking');
        return [...filtered, { id: Date.now().toString(), role: 'senura', type: 'text', content: "I'm sorry, I couldn't connect to Kapruka right now. Let's try again later." }];
      });
    }
  };

  const handleAddToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        id: product.id || product.name,
        name: product.name,
        price: product.price,
        image: product.image,
        url: product.url,
        quantity: 1,
      }];
    });
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', type: 'text', content: `Checking out ${cart.length} item${cart.length > 1 ? 's' : ''} 🛒` },
      { id: Date.now().toString() + '1', role: 'senura', type: 'checkout' }
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue;
    setInputValue("");
    sendMessageToLLM(val);
  };

  const selectLanguage = (langId: string) => {
    setPreferredLanguage(langId);
    setMessages([
      { id: Date.now().toString(), role: 'senura', type: 'text', content: LOCALIZED_GREETINGS[langId] || LOCALIZED_GREETINGS.english }
    ]);
  };

  const isInteractive = (id: string) => messages.length > 0 && messages[messages.length - 1].id === id;

  // We should only show quick replies when the chat is active and not showing rich UI flows yet
  const showQuickReplies = !isTyping && messages.length > 0 && ['text'].includes(messages[messages.length - 1].type);

  if (!isLoaded) return null;

  if (showSplash) {
    return (
      <motion.div 
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center h-screen bg-[#020817] relative overflow-hidden"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute left-[20%] top-[20%] h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/20 blur-[120px]"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="w-24 h-24 rounded-[2rem] bg-amber-400 p-1 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(251,191,36,0.4)]">
            <motion.img 
              src="/icon.png" 
              alt="Vibe Cart" 
              className="w-16 h-16 rounded-[1.2rem]" 
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_20px_rgba(251,191,36,0.3)] mb-3"
          >
            VIBE CART
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]"
          >
            Kapruka AI Assistant
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="mt-10 flex gap-2"
          >
            <motion.div className="w-2 h-2 rounded-full bg-amber-400" animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
            <motion.div className="w-2 h-2 rounded-full bg-amber-400" animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
            <motion.div className="w-2 h-2 rounded-full bg-amber-400" animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  if (!preferredLanguage) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#020817] p-6 relative overflow-hidden">
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-indigo-500/20 blur-[120px]"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="z-10 w-full max-w-md flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
            <img src="/icon.png" alt="Vibe Cart" className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Hello! 👋</h1>
          <h2 className="text-xl font-display text-white mb-8 relative z-10 text-center">
            I'm Vibe Cart, your AI gift-finding assistant. How would you like to chat today?
          </h2>

          <div className="grid grid-cols-1 w-full gap-3">
            {[
              { id: 'english', icon: '🇬🇧', label: 'English', desc: 'Conversational English' },
              { id: 'sinhala', icon: '🇱🇰', label: 'සිංහල', desc: 'Sinhala Script' },
              { id: 'singlish', icon: '💬', label: 'Singlish / Tanglish', desc: 'Sinhala-English blend' },
              { id: 'tanglish', icon: '🖎', label: 'Tanglish', desc: 'Tamil-English blend' },
            ].map(lang => (
              <motion.button
                key={lang.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectLanguage(lang.id)}
                className="flex items-center p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 rounded-2xl transition-all w-full text-left group backdrop-blur-sm"
              >
                <span className="text-2xl mr-4">{lang.icon}</span>
                <div className="flex-1">
                  <h3 className="text-white font-bold group-hover:text-amber-400 transition-colors">{lang.label}</h3>
                  <p className="text-slate-500 text-xs">{lang.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col h-screen bg-[#020817] overflow-hidden relative">

      {/* ─── Background: grid ─── */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* ─── Background: glow orbs ─── */}

      {/* Amber top-left hero orb */}
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-amber-500/25 blur-[140px] z-0"
      />

      {/* Indigo bottom-right */}
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-32 -bottom-32 h-[500px] w-[500px] rounded-full bg-indigo-600/25 blur-[150px] z-0"
      />

      {/* Sky-blue centre orb */}
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.3, 1], opacity: [0.12, 0.28, 0.12], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[360px] w-[360px] rounded-full bg-sky-500/15 blur-[120px] z-0"
      />

      {/* Rose top-right accent */}
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="pointer-events-none absolute right-[10%] top-[8%] h-64 w-64 rounded-full bg-rose-500/20 blur-[100px] z-0"
      />

      {/* Violet bottom-left accent */}
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.35, 1], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="pointer-events-none absolute left-[5%] bottom-[10%] h-72 w-72 rounded-full bg-violet-600/20 blur-[110px] z-0"
      />

      {/* Amber small sparkle mid-right */}
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.6, 1], opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="pointer-events-none absolute right-[25%] top-[40%] h-40 w-40 rounded-full bg-amber-400/20 blur-[80px] z-0"
      />

      {/* Vignette ring */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(2,8,23,0.7) 100%)"
        }}
      />


      {/* ─── Header ─── */}
      <header className="flex-shrink-0 h-14 w-full px-4 flex justify-between items-center bg-[#020817]/90 backdrop-blur-xl border-b border-amber-400/10 z-10 shadow-[0_1px_0_0_rgba(251,191,36,0.08)]">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="Vibe Cart Logo" className="h-7 w-7 object-contain rounded-lg border border-white/10 shadow-[0_0_12px_rgba(251,191,36,0.25)]" />
          <span className="text-sm font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)] mt-0.5">
            VIBE CART
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleProceedToCheckout}
              className="flex items-center gap-1.5 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-full px-3 py-1.5 transition-all group"
            >
              <span className="text-amber-400 text-xs font-bold">🛒 {cart.length}</span>
              <span className="text-amber-400/80 text-[0.65rem] hidden sm:inline group-hover:text-amber-300 transition-colors">Checkout →</span>
            </motion.button>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              title="Clear chat"
              className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full px-3 py-1.5 transition-all text-red-400 text-xs font-semibold"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 bg-sky-400/10 hover:bg-sky-400/20 border border-sky-400/30 rounded-full px-3 py-1.5 transition-all text-sky-400 text-xs font-semibold"
          >
            <span>?</span>
            <span className="hidden sm:inline">How it works</span>
          </button>
          <span className="text-[0.65rem] text-slate-500 uppercase tracking-wider hidden sm:block">
            Powered by Kapruka
          </span>
        </div>
      </header>

      {/* ─── Message List ─── */}
      <div 
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-4 py-6 scrollbar-premium z-10 pb-32"
      >
        <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
          {messages.map((msg) => {
            const active = isInteractive(msg.id);

            if (msg.type === 'text') {
              return (
                <ChatBubble key={msg.id} role={msg.role}>
                  <p className="text-sm">{msg.content}</p>
                </ChatBubble>
              );
            }

            if (msg.type === 'thinking') {
              return (
                <ChatBubble key={msg.id} role={msg.role} noBubble>
                  <ThinkingScreen />
                </ChatBubble>
              );
            }

            if (msg.type === 'reveal') {
              const active = isInteractive(msg.id);
              return (
                <ChatBubble key={msg.id} role={msg.role} noBubble>
                  <div className={!active ? "opacity-80" : ""}>
                    <RevealScreen
                      recommendation={msg.data}
                      recipientName={finalProfile.relationship || "friend"}
                      occasion={finalProfile.occasion || "special day"}
                      onAddToCart={handleAddToCart}
                    />
                    {active && (
                      <div className="flex gap-2 flex-wrap mt-3">
                        {[
                          '🔄 Show different options',
                          '💰 Find something cheaper', 
                          '✨ Go more premium',
                        ].map(chip => (
                          <button
                            key={chip}
                            onClick={() => sendMessageToLLM(chip)}
                            className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-slate-300 cursor-pointer hover:border-amber-400/40 hover:text-amber-400 transition-all"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </ChatBubble>
              );
            }

            if (msg.type === 'browse_results') {
              return (
                <ChatBubble key={msg.id} role={msg.role} noBubble>
                  <BrowseResultsCard
                    products={msg.data.products}
                    category={msg.data.category}
                    totalFound={msg.data.totalFound}
                    onProductSelect={(product) => {
                      const fakeData = {
                        bestMatch: { 
                          id: product.id,
                          name: product.name, 
                          price: product.price, 
                          image: product.image, 
                          url: product.url, 
                          reason: "Nice pick! Want to send this as a gift to someone? I can make it extra special ✦" 
                        },
                        alternatives: []
                      };
                      setMessages(prev => [
                        ...prev,
                        { id: Date.now().toString() + '-reveal', role: 'senura', type: 'reveal', data: fakeData },
                        { 
                          id: Date.now().toString() + '-chips', 
                          role: 'senura', 
                          type: 'chips', 
                          data: ['Gift this 🎁', 'Just ordering for myself'] 
                        }
                      ]);
                    }}
                  />
                </ChatBubble>
              );
            }

            if (msg.type === 'chips') {
              return (
                <ChatBubble key={msg.id} role={msg.role} noBubble>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {msg.data.map((chip: string) => (
                      <button
                        key={chip}
                        onClick={() => sendMessageToLLM(chip)}
                        className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-slate-300 cursor-pointer hover:border-amber-400/40 hover:text-amber-400 transition-all"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </ChatBubble>
              );
            }

            if (msg.type === 'checkout') {
              return (
                <ChatBubble key={msg.id} role={msg.role} noBubble>
                  <CheckoutScreen
                    cart={cart}
                    recipientName={finalProfile.relationship || "friend"}
                    onConfirm={() => {}}
                    onRemoveItem={(id) => setCart(prev => prev.filter(item => item.id !== id))}
                    onClearCart={() => setCart([])}
                  />
                </ChatBubble>
              );
            }

            return null;
          })}
          
          {isTyping && (
             <ChatBubble role="senura">
               <div className="flex gap-1 items-center h-4">
                 <motion.span className="w-1.5 h-1.5 bg-slate-400 rounded-full" animate={{y:[0,-3,0]}} transition={{duration:0.6, repeat:Infinity, delay:0}} />
                 <motion.span className="w-1.5 h-1.5 bg-slate-400 rounded-full" animate={{y:[0,-3,0]}} transition={{duration:0.6, repeat:Infinity, delay:0.2}} />
                 <motion.span className="w-1.5 h-1.5 bg-slate-400 rounded-full" animate={{y:[0,-3,0]}} transition={{duration:0.6, repeat:Infinity, delay:0.4}} />
               </div>
             </ChatBubble>
          )}

          <div ref={messagesEndRef} className="h-10" />
        </div>
      </div>

      {/* ─── Scroll nav buttons ─── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="fixed right-3 bottom-28 z-30 flex flex-col gap-2"
          >
            <button
              onClick={scrollToTop}
              title="Scroll to top"
              className="h-9 w-9 rounded-full bg-[#0f1729]/90 border border-white/15 backdrop-blur flex items-center justify-center text-slate-300 hover:text-amber-400 hover:border-amber-400/40 transition-all shadow-lg hover:shadow-[0_0_16px_rgba(251,191,36,0.2)]"
            >
              <span className="text-sm leading-none">↑</span>
            </button>
            <button
              onClick={() => scrollToBottom()}
              title="Scroll to bottom"
              className="h-9 w-9 rounded-full bg-amber-400/15 border border-amber-400/30 backdrop-blur flex items-center justify-center text-amber-400 hover:bg-amber-400/25 transition-all shadow-lg hover:shadow-[0_0_16px_rgba(251,191,36,0.3)]"
            >
              <span className="text-sm leading-none">↓</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom Input ─── */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#020817] via-[#020817]/96 to-transparent pt-10 px-3 z-20"
        style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))' }}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          
          {showQuickReplies && (
            <div className="flex gap-2 overflow-x-auto scrollbar-premium px-1 pb-1">
              {(LOCALIZED_QUICK_REPLIES[preferredLanguage] || LOCALIZED_QUICK_REPLIES.english).map(reply => (
                <button
                  key={reply}
                  onClick={() => sendMessageToLLM(reply)}
                  className="flex-shrink-0 bg-white/5 hover:bg-amber-400/15 border border-white/10 hover:border-amber-400/50 text-slate-300 hover:text-amber-300 text-xs px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap shadow-sm"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputValue.trim() && !isTyping) {
                    handleSubmit(e as any);
                  }
                }
              }}
              disabled={isTyping}
              placeholder="Tell me about who you're gifting to..."
              className="flex-1 min-w-0 bg-white/[0.07] border border-white/15 rounded-2xl px-4 py-3 text-white text-base placeholder-slate-500 focus:outline-none focus:border-amber-400/60 focus:bg-white/10 focus:shadow-[0_0_28px_rgba(251,191,36,0.18),0_0_0_1px_rgba(251,191,36,0.15)] transition-all backdrop-blur disabled:opacity-50"
              style={{ resize: 'none', overflow: 'hidden', maxHeight: '120px' }}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className={`flex-shrink-0 w-11 h-11 rounded-full bg-amber-400 text-black flex items-center justify-center transition-all ${
                !inputValue.trim() || isTyping
                  ? 'opacity-30 cursor-not-allowed'
                  : 'opacity-100 cursor-pointer hover:opacity-90 hover:scale-105 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
              }`}
            >
              <span className="text-lg leading-none font-bold">↑</span>
            </button>
          </form>

        </div>
      </div>
    </div>

    <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
