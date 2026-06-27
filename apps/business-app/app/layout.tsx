import { Playfair_Display, DM_Sans } from "next/font/google";
import type { Metadata } from "next";

import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PrintsbyTee Business App",
  description: "Internal operations app for production, cost, and profit management.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`} data-scroll-behavior="smooth">
      <body className="min-h-screen bg-offwhite text-black antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
          {children}
        </main>
      </body>
    </html>
  );
}
