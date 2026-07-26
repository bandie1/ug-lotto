import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gold Luxury Lottery',
  description: 'PancakeSwap-style 6-Digit Sequential Matching Lottery',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-50 px-4 py-3">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="font-bold text-xl gold-text tracking-wider">
              GOLD LOTTERY
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-zinc-300 hover:text-yellow-400 font-medium transition">
                User Portal
              </Link>
              <Link href="/admin" className="text-zinc-300 hover:text-yellow-400 font-medium transition">
                Admin Portal
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}