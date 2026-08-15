import { createClient } from "@/lib/supabase/server";

async function getMetrics() {
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    { count: totalPlayers },
    { count: newToday },
    { count: ticketsToday },
    { count: pendingApproval },
    { data: currentRound },
    { count: pendingFraud },
    { data: recentTickets },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .gte("purchased_at", startOfDay.toISOString()),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    supabase
      .from("rounds")
      .select("*")
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fraud_flags")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false),
    supabase
      .from("ledger_entries")
      .select("entry_type, amount_ugx, created_at")
      .gte("created_at", startOfDay.toISOString()),
  ]);

  const revenueToday =
    recentTickets?.reduce((sum, e) => (e.entry_type === "ticket_sale" ? sum + e.amount_ugx : sum), 0) ?? 0;
  const feesToday =
    recentTickets?.reduce((sum, e) => (e.entry_type === "fee" ? sum + e.amount_ugx : sum), 0) ?? 0;
  const payoutsToday =
    recentTickets?.reduce((sum, e) => (e.entry_type === "prize_payout" ? sum + Math.abs(e.amount_ugx) : sum), 0) ?? 0;

  return {
    totalPlayers: totalPlayers ?? 0,
    newToday: newToday ?? 0,
    ticketsToday: ticketsToday ?? 0,
    pendingApproval: pendingApproval ?? 0,
    currentRound,
    pendingFraud: pendingFraud ?? 0,
    revenueToday,
    feesToday,
    payoutsToday,
  };
}

export default async function AdminOverview() {
  const m = await getMetrics();

  const cards: { label: string; value: string | number; href?: string; alert?: boolean }[] = [
    { label: "Total players", value: m.totalPlayers },
    { label: "New players today", value: m.newToday },
    { label: "Tickets sold today", value: m.ticketsToday },
    { label: "Pending approval", value: m.pendingApproval, href: "/admin/tickets" },
    { label: "Ticket revenue today (UGX)", value: m.revenueToday.toLocaleString() },
    { label: "Platform fees today (UGX)", value: m.feesToday.toLocaleString() },
    { label: "Prizes owed today (UGX)", value: m.payoutsToday.toLocaleString() },
    { label: "Pending fraud flags", value: m.pendingFraud, alert: m.pendingFraud > 0 },
    {
      label: "Current round",
      value: m.currentRound
        ? `#${m.currentRound.round_number} (${m.currentRound.status})`
        : "None active",
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ezgold mb-4">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => {
          const cardClass = `bg-ezblacksoft border rounded-2xl p-4 block ${
            c.alert ? "border-ezred" : "border-zinc-800"
          } ${c.href ? "hover:border-ezgold/60 transition-colors" : ""}`;
          const inner = (
            <>
              <p className="text-xs text-zinc-400 mb-1">{c.label}</p>
              <p className={`text-xl font-display font-extrabold ${c.alert ? "text-ezred" : "text-ezgold"}`}>
                {c.value}
              </p>
            </>
          );
          return c.href ? (
            <a key={c.label} href={c.href} className={cardClass}>
              {inner}
            </a>
          ) : (
            <div key={c.label} className={cardClass}>
              {inner}
            </div>
          );
        })}
      </div>

      {m.currentRound && (
        <div className="mt-6 bg-ezblacksoft border border-zinc-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">Current Round Pool</h2>
          <p className="text-2xl font-display font-extrabold text-ezgoldbright">
            UGX {(m.currentRound.total_pool_ugx + (m.currentRound.rollover_in_ugx ?? 0)).toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Includes UGX {(m.currentRound.rollover_in_ugx ?? 0).toLocaleString()} rolled over
          </p>
        </div>
      )}
    </div>
  );
}
