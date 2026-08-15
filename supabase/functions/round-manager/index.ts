// supabase/functions/round-manager/index.ts
// Triggered on a schedule (pg_cron, every 5 min). Handles the full round
// lifecycle: close overdue rounds, draw completed ones, pay out brackets,
// roll over unclaimed prize pools, and open the next round.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const log: string[] = [];

  try {
    await closeOverdueRounds(admin, log);
    await drawDueRounds(admin, log);
    await ensureNextRoundsExist(admin, log);
    return json({ success: true, log });
  } catch (err) {
    log.push(`ERROR: ${String(err)}`);
    return json({ success: false, log }, 500);
  }
});

// ---------- 1. Close rounds whose purchase window has ended ----------
async function closeOverdueRounds(admin: any, log: string[]) {
  const { data: rounds } = await admin
    .from("rounds")
    .select("*")
    .eq("status", "open")
    .lt("closes_at", new Date().toISOString());

  for (const round of rounds ?? []) {
    await admin.from("rounds").update({ status: "closed" }).eq("id", round.id);
    log.push(`Closed round ${round.round_number}`);
  }
}

// ---------- 2. Draw rounds whose scheduled draw time has arrived ----------
async function drawDueRounds(admin: any, log: string[]) {
  const { data: rounds } = await admin
    .from("rounds")
    .select("*")
    .eq("status", "closed")
    .lt("scheduled_draw_at", new Date().toISOString());

  for (const round of rounds ?? []) {
    await admin.from("rounds").update({ status: "drawing" }).eq("id", round.id);

    // --- Commit-reveal: seed was committed when the round opened ---
    // For rounds created before this system existed, fall back to a fresh
    // seed (still cryptographically random, just not pre-committed).
    const seed = round.rng_seed_reveal ?? crypto.randomUUID();

    // Public entropy: hash of all ticket numbers sold this round, so the
    // outcome can't be chosen after seeing final entries (the commit
    // happened before entries were known; this just adds extra bite).
    const { data: roundTickets } = await admin
      .from("tickets")
      .select("id, numbers, user_id")
      .eq("round_id", round.id)
      .eq("status", "valid");

    const publicEntropy = await sha256(
      (roundTickets ?? []).map((t: any) => t.numbers).join("|")
    );

    const winningNumber = await drawNumber(
      seed,
      publicEntropy,
      6,
      9
    );

    // --- Score every ticket ---
    const config = (await admin.from("game_config").select("*").eq("id", 1).single())
      .data;
    const bracketPct: Record<string, number> = config.bracket_percentages;

    const scored = (roundTickets ?? []).map((t: any) => ({
      ...t,
      matched: leftToRightMatch(t.numbers, winningNumber),
    }));

    // --- Determine pool per bracket, including rollover ---
    const totalPool = round.total_pool_ugx + (round.rollover_in_ugx ?? 0);
    const platformFee = totalPool * (config.platform_fee_percent / 100);
    const distributable = totalPool - platformFee;

    const bracketPools: Record<string, number> = {};
    for (const b of Object.keys(bracketPct)) {
      bracketPools[b] = distributable * (bracketPct[b] / 100);
    }

    const winnersByBracket: Record<string, any[]> = {};
    for (const t of scored) {
      if (t.matched > 0) {
        winnersByBracket[t.matched] = winnersByBracket[t.matched] ?? [];
        winnersByBracket[t.matched].push(t);
      }
    }

    const rolloverOut: Record<string, number> = {};
    const ticketUpdates: any[] = [];
    const ledgerRows: any[] = [];

    for (const bracket of Object.keys(bracketPools)) {
      const pool = bracketPools[bracket];
      const winners = winnersByBracket[bracket] ?? [];

      if (winners.length === 0) {
        rolloverOut[bracket] = pool;
        continue;
      }

      const share = Math.floor(pool / winners.length);
      for (const w of winners) {
        ticketUpdates.push({
          id: w.id,
          matched_digits: w.matched,
          prize_bracket: Number(bracket),
          prize_amount_ugx: share,
        });
        ledgerRows.push({
          entry_type: "prize_payout",
          round_id: round.id,
          user_id: w.user_id,
          amount_ugx: -share, // outflow from platform perspective
          notes: `Bracket ${bracket} win, round ${round.round_number}`,
        });
      }
    }

    // Tickets with 0 matches still get a row so "matched_digits" is populated
    for (const t of scored) {
      if (t.matched === 0) {
        ticketUpdates.push({
          id: t.id,
          matched_digits: 0,
          prize_bracket: 0,
          prize_amount_ugx: 0,
        });
      }
    }

    // --- Persist everything ---
    for (const u of ticketUpdates) {
      await admin
        .from("tickets")
        .update({
          matched_digits: u.matched_digits,
          prize_bracket: u.prize_bracket,
          prize_amount_ugx: u.prize_amount_ugx,
        })
        .eq("id", u.id);
    }

    if (ledgerRows.length > 0) {
      await admin.from("ledger_entries").insert(ledgerRows);
    }
    if (platformFee > 0) {
      await admin.from("ledger_entries").insert({
        entry_type: "fee",
        round_id: round.id,
        amount_ugx: platformFee,
        notes: `Platform fee, round ${round.round_number}`,
      });
    }

    await admin
      .from("rounds")
      .update({
        status: "completed",
        winning_number: winningNumber,
        drawn_at: new Date().toISOString(),
        rng_seed_reveal: seed,
        rollover_out: rolloverOut,
      })
      .eq("id", round.id);

    await admin.from("audit_log").insert({
      actor_role: "system",
      action: "round_drawn",
      target_type: "round",
      target_id: String(round.id),
      metadata: { winningNumber, rolloverOut },
    });

    log.push(`Drew round ${round.round_number}: ${winningNumber}`);
  }
}

// ---------- 3. Make sure there's always an upcoming open round per slot ----------
async function ensureNextRoundsExist(admin: any, log: string[]) {
  const { data: config } = await admin.from("game_config").select("*").eq("id", 1).single();
  const drawTimes: string[] = config.draw_times; // e.g. ['13:00','21:00']

  const { data: openRounds } = await admin
    .from("rounds")
    .select("id")
    .in("status", ["open", "closed", "drawing"]);

  // Only create a new round if none are currently in flight — keeps exactly
  // one active round per draw slot at a time.
  if ((openRounds ?? []).length > 0) return;

  const { data: lastRound } = await admin
    .from("rounds")
    .select("*")
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextRoundNumber = (lastRound?.round_number ?? 0) + 1;

  // Figure out the next draw slot time from now
  const now = new Date();
  let nextDraw = nextDrawTime(now, drawTimes);

  const opensAt = now.toISOString();
  const closesAt = new Date(
    nextDraw.getTime() - 0 // sales close exactly at draw time; adjust via purchase_window_minutes if desired
  );
  closesAt.setMinutes(closesAt.getMinutes() - 0);

  // Compute rollover coming in from the previous completed round of the same slot
  let rolloverIn = 0;
  if (lastRound?.status === "completed" && lastRound.rollover_out) {
    rolloverIn = Object.values(lastRound.rollover_out as Record<string, number>).reduce(
      (a: number, b: number) => a + b,
      0
    );
  }

  // Commit a fresh RNG seed now, before any tickets are sold
  const seed = crypto.randomUUID() + crypto.randomUUID();
  const commitHash = await sha256(seed);

  await admin.from("rounds").insert({
    round_number: nextRoundNumber,
    status: "open",
    opens_at: opensAt,
    closes_at: closesAt.toISOString(),
    scheduled_draw_at: nextDraw.toISOString(),
    ticket_price_ugx: config.ticket_price_ugx,
    bracket_percentages: config.bracket_percentages,
    rollover_in_ugx: rolloverIn,
    rng_commit_hash: commitHash,
    rng_seed_reveal: seed, // stored now, only *revealed to players* after draw in the UI
  });

  log.push(`Opened round ${nextRoundNumber}, draws at ${nextDraw.toISOString()}`);
}

function nextDrawTime(from: Date, drawTimes: string[]): Date {
  const candidates = drawTimes.map((t) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date(from);
    d.setHours(h, m, 0, 0);
    if (d <= from) d.setDate(d.getDate() + 1);
    return d;
  });
  return candidates.sort((a, b) => a.getTime() - b.getTime())[0];
}

// ---------- Helpers ----------
function leftToRightMatch(ticket: string, winning: string): number {
  let matched = 0;
  for (let i = 0; i < winning.length; i++) {
    if (ticket[i] === winning[i]) matched++;
    else break;
  }
  return matched;
}

async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function drawNumber(
  seed: string,
  publicEntropy: string,
  digitCount: number,
  maxDigit: number
): Promise<string> {
  const hash = await sha256(seed + publicEntropy);
  let numbers = "";
  for (let i = 0; i < digitCount; i++) {
    const byte = parseInt(hash.substr(i * 2, 2), 16);
    numbers += (byte % (maxDigit + 1)).toString();
  }
  return numbers;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
