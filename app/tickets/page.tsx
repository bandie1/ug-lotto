"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";

type Ticket = {
  id: string;
  numbers: string;
  purchased_at: string;
  price_paid_ugx: number;
  matched_digits: number | null;
  prize_bracket: number | null;
  prize_amount_ugx: number | null;
  prize_paid: boolean;
  status: "pending_approval" | "valid" | "rejected" | "void";
  deposit_network: "mtn" | "airtel" | null;
  rounds: { round_number: number; status: string; winning_number: string | null };
};

type WithdrawalRequest = {
  id: number;
  ticket_id: string;
  status: "pending" | "approved" | "rejected" | "paid";
};

export default function TicketsPage() {
  const supabase = createClient();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [withdrawals, setWithdrawals] = useState<Record<string, WithdrawalRequest>>({});
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: ticketData } = await supabase
      .from("tickets")
      .select("*, rounds(round_number, status, winning_number)")
      .order("purchased_at", { ascending: false })
      .limit(50);
    setTickets((ticketData as any) ?? []);

    const { data: withdrawalData } = await supabase
      .from("withdrawal_requests")
      .select("id, ticket_id, status");
    const map: Record<string, WithdrawalRequest> = {};
    (withdrawalData ?? []).forEach((w: any) => {
      map[w.ticket_id] = w;
    });
    setWithdrawals(map);

    setLoading(false);
  }

  async function requestWithdrawal(ticket: Ticket) {
    setRequesting(ticket.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showToast("Please log in first.", "error");
      setRequesting(null);
      return;
    }

    const { error } = await supabase.from("withdrawal_requests").insert({
      ticket_id: ticket.id,
      player_id: user.id,
      amount_ugx: ticket.prize_amount_ugx,
    });

    if (error) {
      showToast("Could not submit withdrawal request. Please try again.", "error");
    } else {
      showToast("Withdrawal requested — your EziLoto agent will process it soon.", "success");
      load();
    }
    setRequesting(null);
  }

  if (loading) return <p className="text-center text-zinc-400 py-10">Loading your tickets...</p>;

  if (tickets.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400 mb-4">You haven't bought any tickets yet.</p>
        <a href="/" className="inline-block bg-ezgold text-ezblack font-bold rounded-full px-6 py-2.5">
          Play Now
        </a>
      </div>
    );
  }

  const withdrawalStatusLabel: Record<string, { text: string; className: string }> = {
    pending: { text: "Withdrawal pending", className: "text-ezgold" },
    approved: { text: "Withdrawal approved — awaiting payout", className: "text-ezgold" },
    rejected: { text: "Withdrawal rejected — contact your agent", className: "text-ezred" },
    paid: { text: "Paid out", className: "text-ezgreen" },
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ezgold mb-4">My Tickets</h1>
      {tickets.map((t) => {
        const isWin = (t.prize_bracket ?? 0) > 0;
        const isDrawn = t.rounds?.status === "completed";
        const withdrawal = withdrawals[t.id];
        const canRequestWithdrawal = isDrawn && isWin && !t.prize_paid && !withdrawal;

        return (
          <div
            key={t.id}
            className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
              t.status === "pending_approval"
                ? "border-ezgold/50 bg-ezgold/5"
                : t.status === "rejected"
                ? "border-ezred/40 bg-ezred/5"
                : isWin
                ? "border-ezgold bg-ezgold/10"
                : "border-zinc-800 bg-ezblacksoft"
            }`}
          >
            <div>
              <div className="flex gap-1.5 mb-2">
                {t.numbers.split("").map((d, i) => {
                  const matched = isDrawn && i < (t.matched_digits ?? 0);
                  return (
                    <span
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-bold ${
                        matched ? "lotto-ball" : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {d}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-500">
                Round #{t.rounds?.round_number} · {new Date(t.purchased_at).toLocaleString()}
                {t.deposit_network && ` · ${t.deposit_network.toUpperCase()}`}
              </p>
            </div>
            <div className="text-right">
              {t.status === "pending_approval" && (
                <span className="text-xs text-ezgold font-semibold">⏳ Pending approval</span>
              )}
              {t.status === "rejected" && (
                <span className="text-xs text-ezred font-semibold">✕ Deposit not confirmed</span>
              )}
              {t.status === "valid" && !isDrawn && (
                <span className="text-xs text-zinc-400">Pending draw</span>
              )}
              {t.status === "valid" && isDrawn && isWin && (
                <>
                  <p className="text-ezgold font-bold">
                    Won UGX {t.prize_amount_ugx?.toLocaleString()}
                  </p>
                  {t.prize_paid ? (
                    <p className="text-xs text-ezgreen">Paid out</p>
                  ) : withdrawal ? (
                    <p className={`text-xs ${withdrawalStatusLabel[withdrawal.status].className}`}>
                      {withdrawalStatusLabel[withdrawal.status].text}
                    </p>
                  ) : (
                    <button
                      onClick={() => requestWithdrawal(t)}
                      disabled={requesting === t.id}
                      className="mt-1 text-xs bg-ezgold text-ezblack font-semibold rounded-full px-3 py-1.5 disabled:opacity-60"
                    >
                      {requesting === t.id ? "Requesting..." : "Request Withdrawal"}
                    </button>
                  )}
                </>
              )}
              {t.status === "valid" && isDrawn && !isWin && <span className="text-xs text-zinc-500">No win</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
