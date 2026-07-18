import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Order Tracking | Project Patatas",
  description: "Enterprise telecom service order tracking and SLA management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex bg-[#f8fafc] antialiased">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-auto">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
