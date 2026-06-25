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
  title: "Senura ✦ AI Gift-Finding Assistant for Kapruka",
  description: "Find and customize the perfect gift on the Kapruka network with Senura, your culturally attuned Sri Lankan shopping assistant.",
};

import Confetti from "@/components/Confetti";

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
