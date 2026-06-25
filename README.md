# ✦ Senura | Kapruka Shopping Agent

Senura is a culturally-attuned, conversational AI gift-finding assistant designed exclusively for the **Kapruka Delivery Network**. Powered by Google's Gemini 2.5 Flash and built on Next.js, Senura helps users find the perfect gift through a warm, native conversational experience.

## ✨ Features

- **Multi-Language Mastery**: Natively converses in English, Sinhala script, Singlish (Sinhala-English), and Tanglish (Tamil-English) based on user preference.
- **Dynamic Parameter Extraction**: Intelligently extracts relationship, occasion, vibe, and budget from free-form conversations.
- **Kapruka MCP Integration**: Directly queries Kapruka's live inventory and returns real-time product cards with a 24-hour delivery enforcement.
- **Global Cart System**: Supports multi-item cart building and seamless checkout handoff to Kapruka.
- **Premium Glassmorphic UI**: Beautiful, responsive, fluid Framer Motion animations with a sleek dark-mode aesthetic.

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **AI Backend**: Google Gemini 2.5 Flash (`@google/generative-ai`)
- **Styling**: Tailwind CSS & Framer Motion
- **Integration**: Model Context Protocol (MCP)

## 🛠️ Local Development

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Set up your environment variables** in a `.env.local` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   KAPRUKA_MCP_URL=https://mcp.kapruka.com/mcp
   ```
4. **Run the development server**: `npm run dev`

---
*Built for the Kapruka Shopping Agent Challenge.*
