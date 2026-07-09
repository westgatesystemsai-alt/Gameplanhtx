import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Figtree } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Outfit is the display/heading typeface. Weights 800/900 power the wordmark
// and hero headlines in the Game Plan HTX visual identity.
const outfit = Outfit({
  variable: "--font-outfit-family",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

// Figtree is the body/UI typeface for the public brand pass.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Game Plan HTX | Houston Event Vendor Marketplace",
  description:
    "Game Plan HTX connects Houston event planners with trusted local vendors — browse, book, and pay for photographers, caterers, DJs, and more in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
