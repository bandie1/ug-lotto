import { createClient } from "@/lib/supabase/server";

export default async function AdminRoundsPage() {
  const supabase = await createClient();
  const { data: rounds } = await supabase
    .from("rounds")
    .select("*")
    .order("round_number", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ezgold">Rounds</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-800">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Closes</th>
              <th className="py-2 pr-4">Draw time</th>
              <th className="py-2 pr-4">Winning #</th>
              <th className="py-2 pr-4">Pool (UGX)</th>
              <th className="py-2 pr-4">Rollover in</th>
            </tr>
          </thead>
          <tbody>
            {(rounds ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-zinc-900">
                <td className="py-2 pr-4">{r.round_number}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      r.status === "open"
                        ? "bg-ezgreen/30 text-ezgreen"
                        : r.status === "completed"
                        ? "bg-ezgold/20 text-ezgold"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="py-2 pr-4">{new Date(r.closes_at).toLocaleString()}</td>
                <td className="py-2 pr-4">{new Date(r.scheduled_draw_at).toLocaleString()}</td>
                <td className="py-2 pr-4 font-display font-bold text-ezgoldbright">
                  {r.winning_number ?? "—"}
                </td>
                <td className="py-2 pr-4">{r.total_pool_ugx.toLocaleString()}</td>
                <td className="py-2 pr-4">{(r.rollover_in_ugx ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        Rounds open, close, and draw automatically via the scheduled round-manager function. Manual overrides can be added later as needed.
      </p>
    </div>
  );
}
