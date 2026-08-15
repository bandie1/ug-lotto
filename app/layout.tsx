import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavGate from "@/components/NavGate";
import ToastProvider from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "EziLoto — Pick 6, Win Gold",
  description: "Uganda's number-picking lottery game. Pick your 6 digits, twice a day.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0b0d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ezblack text-zinc-100">
        <ToastProvider>
          <NavGate />
          {/* top padding clears the floating top bar (desktop), bottom padding
              clears the floating tab bar (mobile) */}
          <main className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 sm:pt-24 pb-28 sm:pb-10">
            {children}
          </main>
          <footer className="max-w-5xl mx-auto px-4 pb-28 sm:pb-8 text-xs text-zinc-500 border-t border-zinc-800 mt-10 pt-6">
            <p>18+ only. Play responsibly. EziLoto is a game of chance — never spend more than you can afford to lose.</p>
            <p className="mt-1">Need help? Contact your EziLoto agent for support.</p>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
