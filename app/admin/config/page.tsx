"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminConfigPage() {
  const supabase = createClient();
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("game_config").select("*").eq("id", 1).single();
      setConfig(data);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("game_config")
      .update({ ...config, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq("id", 1);

    await supabase.from("audit_log").insert({
      actor_id: user?.id,
      actor_role: "admin",
      action: "config_updated",
      metadata: config,
    });

    setSaving(false);
    setSaved(true);
  }

  if (!config) return <p className="text-zinc-400">Loading config...</p>;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-display text-2xl font-extrabold text-ezgold">Game Config</h1>
      <p className="text-xs text-zinc-500">
        Changes apply to the next round only — the current round is never altered mid-flight.
      </p>

      <Field label="Ticket price (UGX)">
        <input
          type="number"
          value={config.ticket_price_ugx}
          onChange={(e) => setConfig({ ...config, ticket_price_ugx: Number(e.target.value) })}
          className="input"
        />
      </Field>

      <Field label="Draw times (comma-separated, 24h, e.g. 13:00,21:00)">
        <input
          value={config.draw_times.join(",")}
          onChange={(e) => setConfig({ ...config, draw_times: e.target.value.split(",").map((s: string) => s.trim()) })}
          className="input"
        />
      </Field>

      <Field label="Platform fee (%)">
        <input
          type="number"
          value={config.platform_fee_percent}
          onChange={(e) => setConfig({ ...config, platform_fee_percent: Number(e.target.value) })}
          className="input"
        />
      </Field>

      <Field label="Max tickets per purchase">
        <input
          type="number"
          value={config.max_tickets_per_purchase}
          onChange={(e) => setConfig({ ...config, max_tickets_per_purchase: Number(e.target.value) })}
          className="input"
        />
      </Field>

      <Field label="Bracket percentages (JSON: digit-match → %)">
        <textarea
          value={JSON.stringify(config.bracket_percentages, null, 2)}
          onChange={(e) => {
            try {
              setConfig({ ...config, bracket_percentages: JSON.parse(e.target.value) });
            } catch {
              /* ignore until valid JSON */
            }
          }}
          rows={7}
          className="input font-mono text-xs"
        />
      </Field>

      <Field label="Bulk discount tiers (JSON)">
        <textarea
          value={JSON.stringify(config.bulk_discount_tiers, null, 2)}
          onChange={(e) => {
            try {
              setConfig({ ...config, bulk_discount_tiers: JSON.parse(e.target.value) });
            } catch {
              /* ignore until valid JSON */
            }
          }}
          rows={5}
          className="input font-mono text-xs"
        />
      </Field>

      <button
        onClick={save}
        disabled={saving}
        className="bg-ezgold text-ezblack font-bold rounded-lg px-6 py-2.5 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Config"}
      </button>
      {saved && <p className="text-ezgreen text-sm">Saved.</p>}

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          background: #0b0b0d;
          border: 1px solid #3f3f46;
          padding: 0.5rem 0.75rem;
          color: #f4f4f5;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-zinc-400">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
