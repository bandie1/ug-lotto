import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/");

  const links = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/tickets", label: "Tickets" },
    { href: "/admin/rounds", label: "Rounds" },
    { href: "/admin/payouts", label: "Payouts" },
    { href: "/admin/users", label: "Users & OTP" },
    { href: "/admin/config", label: "Game Config" },
    { href: "/admin/ledger", label: "Ledger" },
    { href: "/admin/fraud", label: "Fraud Review" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-10 space-y-6">
      <div className="sticky top-3 z-30 -mx-1 px-1">
        <nav className="flex gap-1 text-sm rounded-full border border-ezgolddeep/30 bg-ezblacksoft/90 backdrop-blur-md px-2 py-2 overflow-x-auto shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-full px-3.5 py-1.5 font-semibold text-zinc-300 hover:text-ezblack hover:bg-ezgold transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
