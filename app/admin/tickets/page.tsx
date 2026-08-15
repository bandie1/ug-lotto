"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";

type TicketRow = {
  id: string;
  numbers: string;
  purchased_at: string;
  price_paid_ugx: number;
  status: "pending_approval" | "valid" | "rejected" | "void";
  deposit_network: "mtn" | "airtel" | null;
  external_payment_ref: string | null;
  profiles: { phone: string; display_name: string | null } | null;
  rounds: { round_number: number } | null;
};

export default function AdminTicketsPage() {
  const supabase = createClient();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending_approval" | "all" | "valid" | "rejected">(
    "pending_approval"
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("tickets")
      .select(
        "id, numbers, purchased_at, price_paid_ugx, status, deposit_network, external_payment_ref, profiles(phone, display_name), rounds(round_number)"
      )
      .order("purchased_at", { ascending: false })
      .limit(100);

    if (filter !== "all") query = query.eq("status", filter);

    const { data } = await query;
    setTickets((data as any) ?? []);
    setLoading(false);
  }

  async function act(ticket: TicketRow, action: "approve" | "reject") {
    setBusyId(ticket.id);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      showToast("Session expired — please log in again.", "error");
      setBusyId(null);
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/approve-ticket`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ticket_id: ticket.id, action }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error ?? "Action failed.", "error");
    } else {
      showToast(
        action === "approve"
          ? `Approved — UGX ${ticket.price_paid_ugx.toLocaleString()} credited to Round #${ticket.rounds?.round_number}.`
          : `Rejected ticket for ${ticket.profiles?.phone ?? "player"}.`,
        action === "approve" ? "success" : "info"
      );
      load();
    }
    setBusyId(null);
  }

  const filters: { key: typeof filter; label: string }[] = [
    { key: "pending_approval", label: "Pending" },
    { key: "valid", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  const networkBadge: Record<string, string> = {
    mtn: "bg-yellow-400/20 text-yellow-300",
    airtel: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ezgold">Tickets</h1>
        <div className="flex rounded-full bg-ezblacksoft border border-ezgolddeep/30 p-1 text-xs font-semibold overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                filter === f.key ? "bg-ezgold text-ezblack" : "text-zinc-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-zinc-400 py-10">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="text-center text-zinc-500 py-10 text-sm">Nothing to show here.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-zinc-800 bg-ezblacksoft p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className="flex gap-1.5">
                    {t.numbers.split("").map((d, i) => (
                      <span
                        key={i}
                        className="lotto-ball w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  {t.deposit_network && (
                    <span
                      className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${networkBadge[t.deposit_network]}`}
                    >
                      {t.deposit_network.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-sm">
                  {t.profiles?.display_name ?? t.profiles?.phone ?? "—"}{" "}
                  <span className="text-zinc-500">· {t.profiles?.phone}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Round #{t.rounds?.round_number} · {new Date(t.purchased_at).toLocaleString()}
                  {t.external_payment_ref && ` · ref: ${t.external_payment_ref}`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-ezgold font-bold text-sm">
                  UGX {t.price_paid_ugx.toLocaleString()}
                </span>

                {t.status === "pending_approval" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(t, "approve")}
                      disabled={busyId === t.id}
                      className="text-xs bg-ezgold text-ezblack font-semibold rounded-full px-3 py-1.5 disabled:opacity-60"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => act(t, "reject")}
                      disabled={busyId === t.id}
                      className="text-xs bg-zinc-800 text-ezred font-semibold rounded-full px-3 py-1.5 disabled:opacity-60"
                    >
                      ✕ Reject
                    </button>
                  </div>
                ) : t.status === "valid" ? (
                  <span className="text-xs text-ezgreen font-semibold px-2">✓ Approved</span>
                ) : t.status === "rejected" ? (
                  <span className="text-xs text-ezred font-semibold px-2">✕ Rejected</span>
                ) : (
                  <span className="text-xs text-zinc-500 px-2">Void</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
