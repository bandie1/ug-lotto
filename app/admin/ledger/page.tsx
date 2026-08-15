import { createClient } from "@/lib/supabase/server";

export default async function AdminLedgerPage() {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("ledger_entries")
    .select("*, profiles(phone), rounds(round_number)")
    .order("created_at", { ascending: false })
    .limit(100);

  const typeColor: Record<string, string> = {
    ticket_sale: "text-ezgreen",
    prize_payout: "text-ezred",
    fee: "text-ezgold",
    rollover: "text-zinc-400",
    adjustment: "text-zinc-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ezgold">Ledger</h1>
        <a
          href="#"
          className="text-xs bg-zinc-800 rounded-full px-3 py-1.5"
          title="Export via Supabase table editor CSV export, or wire up a route handler for CSV download"
        >
          Export CSV (via Supabase table editor)
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-800">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Round</th>
              <th className="py-2 pr-4">Player</th>
              <th className="py-2 pr-4">Amount (UGX)</th>
              <th className="py-2 pr-4">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(entries ?? []).map((e: any) => (
              <tr key={e.id} className="border-b border-zinc-900">
                <td className="py-2 pr-4 text-xs text-zinc-500">
                  {new Date(e.created_at).toLocaleString()}
                </td>
                <td className={`py-2 pr-4 font-medium ${typeColor[e.entry_type] ?? ""}`}>
                  {e.entry_type}
                </td>
                <td className="py-2 pr-4">{e.rounds?.round_number ?? "—"}</td>
                <td className="py-2 pr-4">{e.profiles?.phone ?? "—"}</td>
                <td className="py-2 pr-4">{e.amount_ugx.toLocaleString()}</td>
                <td className="py-2 pr-4 text-xs text-zinc-500">{e.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
