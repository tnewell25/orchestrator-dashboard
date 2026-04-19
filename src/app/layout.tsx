import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import { ChatDrawer } from "@/components/chat-drawer";
import { CommandPalette } from "@/components/command-palette";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Orchestrator",
  description: "Sales engineering pipeline dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full flex">
        <Providers>
          <Sidebar />
          {/* Top padding on mobile reserves space for the hamburger trigger.
              Resets to 0 on lg breakpoint where the static sidebar takes over. */}
          <main className="flex-1 overflow-auto pt-14 lg:pt-0">{children}</main>
          <ChatDrawer />
          <CommandPalette />
        </Providers>
      </body>
    </html>
  );
}
