"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NumberPicker, { generateQuickPick } from "@/components/NumberPicker";
import Countdown from "@/components/Countdown";
import { useToast } from "@/components/ToastProvider";
import DepositModal from "@/components/DepositModal";

type Round = {
  id: number;
  round_number: number;
  closes_at: string;
  scheduled_draw_at: string;
  ticket_price_ugx: number;
  total_pool_ugx: number;
  rollover_in_ugx: number;
};

type PickedTicket = { numbers: string; is_quick_pick: boolean };

export default function PlayPage() {
  const supabase = createClient();
  const { showToast } = useToast();
  const [round, setRound] = useState<Round | null>(null);
  const [tickets, setTickets] = useState<PickedTicket[]>([
    { numbers: "", is_quick_pick: false },
  ]);
  const [mode, setMode] = useState<"manual" | "quick">("manual");
  const [submitting, setSubmitting] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  useEffect(() => {
    loadRound();
  }, []);

  async function loadRound() {
    const { data } = await supabase
      .from("rounds")
      .select("*")
      .eq("status", "open")
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRound(data);
  }

  function addTicket() {
    setTickets([...tickets, { numbers: "", is_quick_pick: mode === "quick" }]);
  }

  function removeTicket(i: number) {
    setTickets(tickets.filter((_, idx) => idx !== i));
  }

  function updateTicket(i: number, numbers: string) {
    const copy = [...tickets];
    copy[i] = { numbers, is_quick_pick: false };
    setTickets(copy);
  }

  function fillQuickPick(i: number) {
    const copy = [...tickets];
    copy[i] = { numbers: generateQuickPick(), is_quick_pick: true };
    setTickets(copy);
  }

  async function handleBuy(deposit_network: "mtn" | "airtel") {
    if (!round) return;
    setSubmitting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      showToast("Please log in first.", "error");
      setSubmitting(false);
      return;
    }

    const payload = {
      round_id: round.id,
      deposit_network,
      tickets: tickets.map((t) => ({
        numbers: t.numbers,
        is_quick_pick: mode === "quick" || !t.numbers,
      })),
      device_fingerprint: navigator.userAgent,
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/buy-tickets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error ?? "Purchase failed.", "error");
    } else {
      showToast(
        `${data.tickets.length} ticket(s) submitted for UGX ${data.total_price_ugx.toLocaleString()} — pending approval once your deposit is confirmed. Good luck!`,
        "success"
      );
      setTickets([{ numbers: "", is_quick_pick: false }]);
      setShowDepositModal(false);
      loadRound();
    }
    setSubmitting(false);
  }

  if (!round) {
    return (
      <div className="text-center py-20 text-zinc-400">
        No round is currently open. Check back soon for the next draw.
      </div>
    );
  }

  const jackpot = round.total_pool_ugx + round.rollover_in_ugx;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="text-center bg-gradient-to-b from-ezblacksoft to-ezblack border border-ezgolddeep/30 rounded-3xl p-5 sm:p-8 gold-glow">
        <p className="uppercase tracking-widest text-xs text-ezgold mb-1">Round #{round.round_number}</p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-ezgoldbright mb-3 break-words">
          UGX {jackpot.toLocaleString()}
        </h1>
        <p className="text-zinc-400 text-sm mb-4">Current prize pool</p>
        <Countdown target={round.closes_at} />
        <p className="text-xs text-zinc-500 mt-2">Time left to buy tickets</p>
      </section>

      {/* Mode toggle */}
      <section className="flex justify-center gap-2">
        <button
          onClick={() => setMode("manual")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            mode === "manual" ? "bg-ezgold text-ezblack" : "bg-ezblacksoft text-zinc-300"
          }`}
        >
          Pick My Numbers
        </button>
        <button
          onClick={() => setMode("quick")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            mode === "quick" ? "bg-ezgold text-ezblack" : "bg-ezblacksoft text-zinc-300"
          }`}
        >
          Quick Pick
        </button>
      </section>

      {/* Ticket builder */}
      <section className="space-y-4">
        {tickets.map((t, i) => (
          <div key={i} className="bg-ezblacksoft border border-zinc-800 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-zinc-400">Ticket {i + 1}</span>
              {tickets.length > 1 && (
                <button onClick={() => removeTicket(i)} className="text-xs text-ezred">
                  Remove
                </button>
              )}
            </div>
            {mode === "manual" ? (
              <NumberPicker value={t.numbers} onChange={(v) => updateTicket(i, v)} />
            ) : (
              <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
                <div className="flex gap-1.5 sm:gap-2">
                  {(t.numbers || "??????").split("").map((d, idx) => (
                    <div
                      key={idx}
                      className="lotto-ball w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-display font-extrabold text-base sm:text-lg"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => fillQuickPick(i)}
                  className="text-xs bg-ezgold text-ezblack rounded-full px-3 py-1.5 font-semibold"
                >
                  {t.numbers ? "Re-roll" : "Generate"}
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={addTicket}
          className="w-full border border-dashed border-ezgolddeep/50 rounded-2xl py-3 text-sm text-ezgold hover:bg-ezblacksoft transition-colors"
        >
          + Add another ticket
        </button>
      </section>

      {/* Summary + buy */}
      <section className="bg-ezblacksoft border border-ezgolddeep/30 rounded-2xl p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Ticket price</span>
          <span>UGX {round.ticket_price_ugx.toLocaleString()} each</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Tickets selected</span>
          <span>{tickets.length}</span>
        </div>
        <div className="flex justify-between font-bold text-ezgold">
          <span>Estimated total</span>
          <span>UGX {(tickets.length * round.ticket_price_ugx).toLocaleString()}</span>
        </div>

        <button
          onClick={() => setShowDepositModal(true)}
          disabled={submitting || (mode === "manual" && tickets.some((t) => t.numbers.length !== 6))}
          className="w-full rounded-xl bg-ezgold hover:bg-ezgoldbright text-ezblack font-bold py-3 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Processing..." : "Confirm & Buy Tickets"}
        </button>
        <p className="text-xs text-zinc-500 text-center">
          Payment is confirmed by your EziLoto agent — this just records your ticket.
        </p>
      </section>

      {showDepositModal && (
        <DepositModal
          totalUgx={tickets.length * round.ticket_price_ugx}
          submitting={submitting}
          onCancel={() => setShowDepositModal(false)}
          onConfirm={handleBuy}
        />
      )}
    </div>
  );
}
