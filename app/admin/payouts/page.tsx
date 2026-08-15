"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";

type Row = {
  withdrawal_id: number | null;
  status: "no_request" | "pending" | "approved" | "rejected" | "paid";
  ticket_id: string;
  numbers: string;
  round_number: number;
  phone: string;
  display_name: string | null;
  amount_ugx: number;
  requested_at: string | null;
};

export default function AdminPayoutsPage() {
  const supabase = createClient();
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "needs_action" | "paid">("needs_action");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    // Every winning ticket, left-joined with any withdrawal request for it.
    const { data: tickets } = await supabase
      .from("tickets")
      .select(
        "id, numbers, prize_amount_ugx, prize_paid, profiles(phone, display_name), rounds(round_number, status), withdrawal_requests(id, status, requested_at, amount_ugx)"
      )
      .gt("prize_bracket", 0)
      .order("purchased_at", { ascending: false })
      .limit(200);

    const mapped: Row[] = (tickets ?? [])
      .filter((t: any) => t.rounds?.status === "completed")
      .map((t: any) => {
        const wr = t.withdrawal_requests?.[0];
        return {
          withdrawal_id: wr?.id ?? null,
          status: t.prize_paid ? "paid" : wr?.status ?? "no_request",
          ticket_id: t.id,
          numbers: t.numbers,
          round_number: t.rounds?.round_number,
          phone: t.profiles?.phone ?? "—",
          display_name: t.profiles?.display_name ?? null,
          amount_ugx: t.prize_amount_ugx ?? 0,
          requested_at: wr?.requested_at ?? null,
        };
      });

    setRows(mapped);
    setLoading(false);
  }

  async function approve(row: Row) {
    if (!row.withdrawal_id) return;
    setBusyId(row.ticket_id);
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({ status: "approved", processed_at: new Date().toISOString() })
      .eq("id", row.withdrawal_id);

    if (error) showToast("Could not approve withdrawal.", "error");
    else {
      showToast(`Approved withdrawal for ${row.phone}.`, "success");
      load();
    }
    setBusyId(null);
  }

  async function markPaid(row: Row) {
    setBusyId(row.ticket_id);

    const { error: ticketError } = await supabase
      .from("tickets")
      .update({ prize_paid: true })
      .eq("id", row.ticket_id);

    if (row.withdrawal_id) {
      await supabase
        .from("withdrawal_requests")
        .update({ status: "paid", processed_at: new Date().toISOString() })
        .eq("id", row.withdrawal_id);
    }

    if (ticketError) showToast("Could not mark this payout as paid.", "error");
    else {
      showToast(`Marked UGX ${row.amount_ugx.toLocaleString()} as paid to ${row.phone}.`, "success");
      load();
    }
    setBusyId(null);
  }

  async function reject(row: Row) {
    if (!row.withdrawal_id) return;
    setBusyId(row.ticket_id);
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({ status: "rejected", processed_at: new Date().toISOString() })
      .eq("id", row.withdrawal_id);

    if (error) showToast("Could not reject withdrawal.", "error");
    else {
      showToast(`Rejected withdrawal for ${row.phone}.`, "info");
      load();
    }
    setBusyId(null);
  }

  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "paid") return r.status === "paid";
    return r.status !== "paid"; // needs_action
  });

  const statusBadge: Record<Row["status"], string> = {
    no_request: "bg-zinc-800 text-zinc-400",
    pending: "bg-ezgold/20 text-ezgold",
    approved: "bg-ezgold/30 text-ezgold",
    rejected: "bg-ezred/20 text-ezred",
    paid: "bg-ezgreen/20 text-ezgreen",
  };

  const statusLabel: Record<Row["status"], string> = {
    no_request: "No request yet",
    pending: "Pending approval",
    approved: "Approved — awaiting payout",
    rejected: "Rejected",
    paid: "Paid",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ezgold">Payouts</h1>
        <div className="flex rounded-full bg-ezblacksoft border border-ezgolddeep/30 p-1 text-xs font-semibold">
          {(["needs_action", "all", "paid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                filter === f ? "bg-ezgold text-ezblack" : "text-zinc-400"
              }`}
            >
              {f === "needs_action" ? "Needs action" : f === "all" ? "All" : "Paid"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-zinc-400 py-10">Loading payouts...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-zinc-500 py-10 text-sm">Nothing to show here.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.ticket_id}
              className="rounded-2xl border border-zinc-800 bg-ezblacksoft p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <div className="flex gap-1.5 mb-2">
                  {r.numbers.split("").map((d, i) => (
                    <span
                      key={i}
                      className="lotto-ball w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <p className="text-sm">
                  {r.display_name ?? r.phone} <span className="text-zinc-500">· {r.phone}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Round #{r.round_number}
                  {r.requested_at && ` · requested ${new Date(r.requested_at).toLocaleString()}`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-ezgold font-bold">UGX {r.amount_ugx.toLocaleString()}</p>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${statusBadge[r.status]}`}>
                    {statusLabel[r.status]}
                  </span>
                </div>

                <div className="flex gap-2">
                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => approve(r)}
                        disabled={busyId === r.ticket_id}
                        className="text-xs bg-ezgold text-ezblack font-semibold rounded-full px-3 py-1.5 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(r)}
                        disabled={busyId === r.ticket_id}
                        className="text-xs bg-zinc-800 text-ezred font-semibold rounded-full px-3 py-1.5 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {(r.status === "approved" || r.status === "no_request") && (
                    <button
                      onClick={() => markPaid(r)}
                      disabled={busyId === r.ticket_id}
                      className="text-xs bg-ezgreen text-white font-semibold rounded-full px-3 py-1.5 disabled:opacity-60"
                    >
                      ✓ Mark Paid
                    </button>
                  )}
                  {r.status === "paid" && (
                    <span className="text-xs text-ezgreen font-semibold px-2">✓ Paid</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
