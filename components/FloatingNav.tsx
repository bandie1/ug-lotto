"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Play", icon: "🎟️" },
  { href: "/tickets", label: "Tickets", icon: "📋" },
  { href: "/results", label: "Results", icon: "🏆" },
];

export default function FloatingNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop / tablet: floating pill bar pinned to the top */}
      <header className="hidden sm:block fixed top-4 left-1/2 -translate-x-1/2 z-30 w-[min(92%,780px)]">
        <div className="flex items-center justify-between gap-4 rounded-full border border-ezgolddeep/30 bg-ezblacksoft/90 backdrop-blur-md px-5 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <Link href="/" className="font-display text-xl font-extrabold text-ezgold tracking-wide shrink-0">
            EziLoto <span className="text-ezgoldbright">●</span>
          </Link>

          <nav className="flex items-center gap-1 rounded-full bg-ezblack/60 p-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    active ? "bg-ezgold text-ezblack" : "text-zinc-300 hover:text-ezgold"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="shrink-0 text-xs font-semibold text-zinc-400 hover:text-ezred transition-colors px-2"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Mobile: floating bottom tab bar, thumb-reachable */}
      <nav className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-sm">
        <div className="flex items-center justify-between rounded-full border border-ezgolddeep/30 bg-ezblacksoft/95 backdrop-blur-md px-2 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.55)]">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 flex-1 rounded-full py-1.5 text-[11px] font-semibold transition-colors ${
                  active ? "bg-ezgold text-ezblack" : "text-zinc-300"
                }`}
              >
                <span className="text-lg leading-none">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 flex-1 rounded-full py-1.5 text-[11px] font-semibold text-zinc-400"
          >
            <span className="text-lg leading-none">🚪</span>
            Log out
          </button>
        </div>
      </nav>
    </>
  );
}
