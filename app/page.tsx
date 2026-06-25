"use client";

import CheckoutScreen from "@/components/CheckoutScreen";
import RevealScreen from "@/components/RevealScreen";
import ThinkingScreen from "@/components/ThinkingScreen";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type MessageType = 'text' | 'thinking' | 'reveal' | 'checkout';

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
  english: "Hi, I'm Senura ✦ Tell me about who you're gifting to and I'll find the perfect match!",
  sinhala: "ආයුබෝවන්! මම සෙනුර ✦ ඔයා තෑග්ගක් දෙන්න හිතන් ඉන්නේ කාටද කියලා මට කියන්න, මම ගැලපෙනම එක හොයලා දෙන්නම්!",
  singlish: "Ayubowan! Mama Senura ✦ Oyata kaatada gift ekak denna one? Kiyanna, mama hodama eka hoyala dennam!",
  tanglish: "Vannakkam! Naan Senura ✦ Ungalukku yaarkku gift panna venum? Sollunga, naan best gift kandupidichu tharen!"
};

function ChatBubble({ role, children, hint, noBubble }: { role: 'user'|'senura', children: React.ReactNode, hint?: string, noBubble?: boolean }) {
  const isUser = role === 'user';
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 mr-3 mt-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-black shadow-sm">
            S
          </div>
        </div>
      )}
      <div className={`flex flex-col max-w-[90%] md:max-w-[75%]`}>
        {hint && (
          <div className="mb-2 w-max rounded-2xl rounded-tl-none bg-white/10 px-4 py-2 text-[0.7rem] italic text-slate-400 backdrop-blur border border-white/5 shadow-sm">
            {hint}
          </div>
        )}
        <div className={`${noBubble ? '' : (isUser ? 'bg-amber-400/10 border border-amber-400/30 text-amber-50 rounded-2xl rounded-tr-sm px-4 py-3' : 'bg-white/5 border border-white/10 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3')} backdrop-blur`}>
          {children}
        </div>
      </div>
    </motion.div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [finalProfile, setFinalProfile] = useState<any>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem('senura_messages');
    const savedLanguage = localStorage.getItem('senura_language');
    const savedCart = localStorage.getItem('senura_cart');
    const savedProfile = localStorage.getItem('senura_profile');

    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedLanguage) setPreferredLanguage(savedLanguage);
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedProfile) setFinalProfile(JSON.parse(savedProfile));
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('senura_messages', JSON.stringify(messages));
    localStorage.setItem('senura_language', preferredLanguage);
    localStorage.setItem('senura_cart', JSON.stringify(cart));
    localStorage.setItem('senura_profile', JSON.stringify(finalProfile));
  }, [messages, preferredLanguage, cart, finalProfile, isLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessageToLLM = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString() + '-u', role: 'user', type: 'text', content: text };
    
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const history = messages.filter(m => m.type === 'text').map(m => ({
      role: m.role,
      content: m.content
    }));
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message: text, preferredLanguage }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      
      const aiMsg: Message = { id: Date.now().toString() + '-s', role: 'senura', type: 'text', content: data.message };
      setMessages(prev => [...prev, aiMsg]);

      if (data.status === "ready_to_search") {
        setFinalProfile(data.parameters);
        setMessages(prev => [...prev, { id: Date.now().toString() + '-t', role: 'senura', type: 'thinking' }]);
        void fetchRecommendation(data.parameters);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now().toString() + '-err', role: 'senura', type: 'text', content: "Oops, something went wrong connecting to my brain. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const fetchRecommendation = async (recipientProfile: any) => {
    try {
      const response = await fetch("/api/kapruka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientProfile }),
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

      setMessages(prev => {
        const filtered = prev.filter(m => m.type !== 'thinking');
        return [...filtered, { id: Date.now().toString(), role: 'senura', type: 'reveal', data }];
      });
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
          <div className="w-16 h-16 rounded-full bg-amber-400 text-black flex items-center justify-center text-3xl font-bold mb-6 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
            S
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Ayubowan! Vanakkam! Hello! 👋</h1>
          <p className="text-slate-400 text-center mb-8 text-sm px-4">
            I'm Senura, your AI gift-finding assistant. How would you like to chat today?
          </p>

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
    <div className="flex flex-col h-screen bg-[#020817] overflow-hidden relative">
      {/* ─── Background Elements ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <motion.div
        aria-hidden
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute left-[20%] top-[20%] h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/20 blur-[120px]"
      />
      <motion.div
        aria-hidden
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.5, 0.2],
          rotate: [0, -90, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute right-[20%] bottom-[20%] h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-500/20 blur-[120px]"
      />

      {/* ─── Header ─── */}
      <header className="flex-shrink-0 w-full px-6 py-4 flex justify-between items-center bg-[#020817]/80 backdrop-blur border-b border-white/5 z-10">
        <span className="text-sm font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
          ✦ SENURA
        </span>
        <div className="flex items-center gap-3">
          {cart.length > 0 && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleProceedToCheckout}
              className="flex items-center gap-2 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-full px-4 py-1.5 transition-all group"
            >
              <span className="text-amber-400 text-xs font-bold">🛒 {cart.length}</span>
              <span className="text-amber-400/80 text-[0.65rem] hidden sm:inline group-hover:text-amber-300 transition-colors">Checkout →</span>
            </motion.button>
          )}
          <span className="text-[0.65rem] text-slate-500 uppercase tracking-wider">
            Powered by Kapruka & Gemini
          </span>
        </div>
      </header>

      {/* ─── Message List ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide z-10 pb-32">
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
              return (
                <ChatBubble key={msg.id} role={msg.role} noBubble>
                  <div className={!active ? "opacity-80 pointer-events-none" : ""}>
                    <RevealScreen
                      recommendation={msg.data}
                      recipientName={finalProfile.relationship || "friend"}
                      occasion={finalProfile.occasion || "special day"}
                      onAddToCart={handleAddToCart}
                    />
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

      {/* ─── Bottom Input ─── */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#020817] via-[#020817]/95 to-transparent pb-4 pt-12 px-4 z-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          
          {showQuickReplies && (
            <div className="flex gap-2 overflow-x-auto scrollbar-premium px-1 pb-1">
              {(LOCALIZED_QUICK_REPLIES[preferredLanguage] || LOCALIZED_QUICK_REPLIES.english).map(reply => (
                <button
                  key={reply}
                  onClick={() => sendMessageToLLM(reply)}
                  className="flex-shrink-0 bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/50 text-slate-300 text-[0.75rem] px-4 py-2 rounded-full transition-all whitespace-nowrap"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
              placeholder="Type your message..."
              className="w-full bg-white/10 border border-white/10 rounded-2xl pl-5 pr-12 py-3.5 text-white text-sm placeholder-slate-400 focus:outline-none focus:border-amber-400/50 focus:shadow-[0_0_20px_rgba(251,191,36,0.15)] transition-all backdrop-blur disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              <span className="text-lg leading-none mt-[-2px]">↑</span>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
