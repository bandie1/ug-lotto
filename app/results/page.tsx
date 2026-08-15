
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Round = {
  id: number;
  round_number: number;
  winning_number: string | null;
  drawn_at: string | null;
  total_pool_ugx: number;
  rng_commit_hash: string | null;
  rng_seed_reveal: string | null;
};

export default function ResultsPage() {
  const supabase = createClient();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [myWinningRoundIds, setMyWinningRoundIds] = useState<Set<number>>(new Set());
  const [openId, setOpenId] = useState<number | null>(null);
  const [onlyMyWins, setOnlyMyWins] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("rounds")
        .select("*")
        .eq("status", "completed")
        .order("round_number", { ascending: false })
        .limit(100);
      setRounds((data as any) ?? []);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: winningTickets } = await supabase
          .from("tickets")
          .select("round_id")
          .gt("prize_bracket", 0);
        setMyWinningRoundIds(new Set((winningTickets ?? []).map((t: any) => t.round_id)));
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return rounds.filter((r) => {
      if (onlyMyWins && !myWinningRoundIds.has(r.id)) return false;
      if (dateFrom && r.drawn_at && new Date(r.drawn_at) < new Date(dateFrom)) return false;
      if (dateTo && r.drawn_at && new Date(r.drawn_at) > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [rounds, onlyMyWins, dateFrom, dateTo, myWinningRoundIds]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ezgold mb-1">Past Draws</h1>
      <p className="text-xs text-zinc-500 mb-2">
        Every draw is provably fair: the result seed is committed before sales close and revealed here after the draw, so anyone can verify it.
      </p>

      {/* Filters */}
      <div className="bg-ezblacksoft border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <button
          onClick={() => setOnlyMyWins((v) => !v)}
          className={`text-xs font-semibold rounded-full px-3.5 py-2 transition-colors ${
            onlyMyWins ? "bg-ezgold text-ezblack" : "bg-ezblack text-zinc-300 border border-zinc-700"
          }`}
        >
          🏆 My winning draws only
        </button>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-zinc-500 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg bg-ezblack border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-zinc-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg bg-ezblack border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-100"
          />
        </div>
        {(onlyMyWins || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setOnlyMyWins(false);
              setDateFrom("");
              setDateTo("");
            }}
            className="text-xs text-zinc-500 underline decoration-dotted"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-zinc-500 text-sm py-10">No draws match these filters.</p>
      )}

      {filtered.map((r) => {
        const isOpen = openId === r.id;
        const iWon = myWinningRoundIds.has(r.id);
        return (
          <div key={r.id} className="bg-ezblacksoft border border-zinc-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenId(isOpen ? null : r.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-300 font-medium">Round #{r.round_number}</span>
                {iWon && (
                  <span className="text-[10px] bg-ezgold/20 text-ezgold rounded-full px-2 py-0.5 font-semibold">
                    You won
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">
                  {r.drawn_at && new Date(r.drawn_at).toLocaleDateString()}
                </span>
                <span className={`text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                <div className="flex gap-1.5 mb-3">
                  {r.winning_number?.split("").map((d, i) => (
                    <span
                      key={i}
                      className="lotto-ball w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-bold"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-zinc-500">Pool: UGX {r.total_pool_ugx.toLocaleString()}</p>
                <details className="mt-2">
                  <summary className="text-xs text-ezgold cursor-pointer">Verify fairness</summary>
                  <p className="text-xs text-zinc-500 mt-1 break-all">Commit hash: {r.rng_commit_hash}</p>
                  <p className="text-xs text-zinc-500 break-all">Revealed seed: {r.rng_seed_reveal}</p>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
