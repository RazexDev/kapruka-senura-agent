import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
});

export const metadata: Metadata = {
  title: "Vibe Cart ✦ AI Gift-Finding Assistant for Kapruka",
  description: "Find and customize the perfect gift on the Kapruka network with Vibe Cart, your culturally attuned Sri Lankan shopping assistant.",
};

import Confetti from "@/components/Confetti";
import { getCatalog } from '@/lib/kaprukaCatalog';

// Trigger catalog build in background on server start
// Don't await — let it build while app loads
getCatalog().catch(console.error);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfairDisplay.variable} bg-[#020817] antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <style>{`
          :root {
            --accent: #f59e0b;
          }
          .font-display {
            font-family: var(--font-playfair-display), ui-serif, serif;
          }
        `}</style>
      </head>
      <body
        className={`${inter.className} min-h-screen overflow-x-hidden flex flex-col`}
      >
        <Confetti />
        {children}
      </body>
    </html>
  );
}
