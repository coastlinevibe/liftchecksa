import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LiftCheck S.A - Verified Lift Club Safety",
  description: "Check the driver before you pay. Verified lifts for South Africans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full flex flex-col`} suppressHydrationWarning>
        <Header />
        <main className="flex-1 pb-24 md:pb-0">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
