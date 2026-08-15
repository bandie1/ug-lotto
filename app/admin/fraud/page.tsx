"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminFraudPage() {
  const supabase = createClient();
  const [flags, setFlags] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("fraud_flags")
      .select("*, profiles(phone)")
      .order("created_at", { ascending: false })
      .limit(50);
    setFlags(data ?? []);
  }

  async function resolve(id: number) {
    await supabase.from("fraud_flags").update({ resolved: true }).eq("id", id);
    load();
  }

  async function suspend(userId: string, flagId: number) {
    await supabase.from("profiles").update({ status: "suspended" }).eq("id", userId);
    await resolve(flagId);
  }

  const severityColor: Record<string, string> = {
    low: "bg-zinc-700 text-zinc-300",
    medium: "bg-ezgold/30 text-ezgold",
    high: "bg-ezred/30 text-ezred",
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ezgold">Fraud Review</h1>
      {flags.filter((f) => !f.resolved).length === 0 && (
        <p className="text-zinc-500 text-sm">No pending flags. All clear.</p>
      )}
      {flags
        .filter((f) => !f.resolved)
        .map((f) => (
          <div key={f.id} className="bg-ezblacksoft border border-zinc-800 rounded-xl p-4 flex justify-between items-start flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${severityColor[f.severity]}`}>
                  {f.severity}
                </span>
                <span className="text-sm font-medium">{f.flag_type}</span>
              </div>
              <p className="text-xs text-zinc-500">Player: {f.profiles?.phone ?? "unknown"}</p>
              <pre className="text-xs text-zinc-600 mt-1 max-w-md overflow-x-auto">
                {JSON.stringify(f.details, null, 2)}
              </pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => resolve(f.id)}
                className="text-xs bg-zinc-700 rounded-full px-3 py-1.5"
              >
                Dismiss
              </button>
              <button
                onClick={() => suspend(f.user_id, f.id)}
                className="text-xs bg-ezred text-white rounded-full px-3 py-1.5"
              >
                Suspend player
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
