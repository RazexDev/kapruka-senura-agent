<div align="center">

<br/>

<!-- Animated title using HTML img trick via shields badges -->

# ✦ VibeCart

### *Your AI-Powered Gift Discovery Companion for Sri Lanka*

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Kapruka](https://img.shields.io/badge/Kapruka_MCP-Live_Inventory-FF6B00?style=for-the-badge)](https://kapruka.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animations-FF0080?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<br/>

> ***Talk to Senura in your language. Get the perfect gift. Send it with love.***

<br/>

---

</div>

## ✨ What is VibeCart?

**VibeCart** is a culturally-aware, conversational AI gift-finding assistant built exclusively for the **Kapruka** delivery network in Sri Lanka. Powered by **Google Gemini 2.5 Flash** and an advanced multi-stage search pipeline, VibeCart helps users discover and purchase gifts through a warm, natural conversation — in the language that feels most like home.

No forms. No filters. Just talk.

<br/>

---

## 🌟 Core Features

<br/>

### 💬 Vibe-Driven Multi-Language Chat
Chat naturally with **Senura**, your AI gift companion, in whichever language feels comfortable:

| Language | Example |
|----------|---------|
| 🇬🇧 English | *"Looking for a birthday gift for my mom under Rs. 3000"* |
| 🇱🇰 සිංහල | *"අම්මාට දෙන්න birthday gift එකක් හොයනවා"* |
| Singlish | *"Thaththa birthday eke okkoma dennam, budget 5000 vitharai"* |
| Tanglish | *"Amma kku birthday gift venum, Rs. 3000 budget"* |

<br/>

### 🧠 Intelligent Gift Customization

Senura auto-extracts all the key gifting parameters from your conversation without forms:

```
Relationship  →  mother / brother / partner / best friend
Occasion      →  birthday / anniversary / Avurudu / graduation
Budget        →  under Rs. 2000 / Rs. 2000–5000 / go all out 💎
Personality   →  foodie / homebody / trendsetter / techie / sporty
```

> No more generic mugs. Senura builds a precise profile and searches Kapruka for what actually fits.

<br/>

### 🎯 Smart Query Extraction (5-Stage Search Pipeline)

Our custom-built search engine processes your intent through 5 intelligent stages:

```
Stage 1 → Extract raw product keywords from user message
Stage 2 → Search Kapruka directly with exact user terms
Stage 3 → If results found (≥2) → return immediately, skip catalog
Stage 4 → If raw search fails → consult product catalog for synonyms
Stage 5 → If all searches fail → honest empty state with suggestions
```

**Whole-word regex matching** prevents false hits — `"phone"` won't match `"headphones"` or `"earphones"`.

<br/>

### 🛒 Multi-Item Gift Bundling

Build a **custom gift bundle** across multiple searches, right inside the chat:

- Add any product to a **persistent cart** with a single click
- The **Add to Cart** button turns green ✓ to confirm each pick
- Cart persists across your full session via `localStorage`
- Checkout button appears dynamically in the header as you add items

<br/>

### 📦 Logistics-Aware Checkout

A strictly validated checkout flow designed for real Sri Lankan delivery:

- **24-hour advance notice** enforced on delivery date selection
- Full sender, recipient, delivery address, and gift message collection
- **Pydantic-validated** MCP payload sent to Kapruka's order system
- Secure redirect to the **Kapruka payment gateway** upon success

<br/>

---

## 🎨 UI & Design System

VibeCart features a **premium glassmorphic dark-mode interface** built to impress:

| Element | Detail |
|---------|--------|
| Background | 6 animated glow orbs (amber, indigo, sky, rose, violet) + radial vignette |
| Grid overlay | Subtle 44px dot-grid texture for depth |
| Header | Amber-tinted glow border, logo icon shadow, `backdrop-blur-xl` |
| Chat input | Glass effect with double-ring amber focus glow |
| Send button | Golden drop-shadow, scale-up on hover |
| Animations | Framer Motion `AnimatePresence` for all transitions |
| Typography | Antialiased, GPU-accelerated text rendering |
| Selection | Golden highlight color on text selection |

<br/>

---

## 🆕 Recently Shipped

```diff
+ 5-stage search pipeline: user terms always tried first, catalog is fallback
+ Whole-word regex matching in catalog scorer (fixes earphones/headphones bug)
+ Personality detection exclusion list for product words
+ HelpModal — full "How it Works" overlay accessible from header
+ Scroll-to-top / Scroll-to-bottom floating nav buttons
+ Clear Chat button with full session + localStorage reset
+ Add to Cart green confirmation animation (2s)
+ 6 animated background glow orbs + vignette
+ Pydantic-safe checkout payload (removed extra_forbidden fields)
+ Payload size limit raised to 50KB for long conversations
+ Styled amber scrollbar on chat container
- Removed "Powered by Gemini" from header (cleaner branding)
```

<br/>

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **AI Backend** | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| **Styling** | Tailwind CSS v4 |
| **Animations** | Framer Motion |
| **Search** | Custom 5-stage pipeline + Kapruka MCP |
| **Checkout** | Model Context Protocol (MCP) → Kapruka API |
| **Language** | TypeScript 5 |
| **State** | React `useState` + `localStorage` persistence |

<br/>

---

## 🛠️ Local Development

**1. Clone the repository**
```bash
git clone https://github.com/RazexDev/kapruka-senura-agent.git
cd kapruka-senura-agent/senura
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables** — create `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
KAPRUKA_MCP_URL=https://mcp.kapruka.com/mcp
```

**4. Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

<br/>

---

## 📁 Project Structure

```
senura/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Gemini LLM + intent routing
│   │   ├── kapruka/route.ts       # Browse & gift search pipeline
│   │   └── kapruka/checkout/      # Logistics-aware checkout handler
│   ├── globals.css                # Design tokens & scrollbar styles
│   └── page.tsx                   # Main chat UI + state management
├── components/
│   ├── BrowseResultsCard.tsx      # Product grid for browse mode
│   ├── CheckoutScreen.tsx         # Full delivery & payment form
│   ├── HelpModal.tsx              # "How it Works" overlay
│   ├── RevealScreen.tsx           # AI gift reveal card
│   └── ThinkingScreen.tsx         # Animated loading state
└── lib/
    ├── kaprukaCatalog.ts          # Live catalog builder + scorer
    ├── mcpClient.ts               # MCP JSON-RPC client
    └── searchEngine.ts            # Local intent & personality engine
```

<br/>

---

<div align="center">

*Built for the Kapruka Shopping Agent Challenge*

**[kapruka.com](https://kapruka.com)** · Made with ❤️ in Sri Lanka

</div>
