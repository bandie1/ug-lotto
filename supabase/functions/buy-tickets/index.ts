// supabase/functions/buy-tickets/index.ts
// All ticket purchases go through here. The client never inserts into
// `tickets` directly — this function enforces every anti-cheat rule.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TicketRequest = {
  numbers: string; // 6-digit string, or "" if quick pick
  is_quick_pick: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing auth token." }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerData, error: callerError } =
      await admin.auth.getUser(jwt);
    if (callerError || !callerData.user) {
      return json({ error: "Invalid session." }, 401);
    }
    const userId = callerData.user.id;

    const body = await req.json();
    const round_id: number = body.round_id;
    const tickets_requested: TicketRequest[] = body.tickets ?? [];
    const external_payment_ref: string | undefined = body.external_payment_ref;
    const deposit_network: string | undefined = body.deposit_network;
    const ip_address =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const device_fingerprint: string | undefined = body.device_fingerprint;

    if (!round_id || tickets_requested.length === 0) {
      return json({ error: "round_id and at least one ticket are required." }, 400);
    }
    if (!deposit_network || !["mtn", "airtel"].includes(deposit_network)) {
      return json({ error: "A valid deposit network (mtn or airtel) is required." }, 400);
    }

    // ---- 1. Player status check ----
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || profile.status !== "active") {
      return json({ error: "Account is not active." }, 403);
    }

    // ---- 2. Round status + timing check (server-authoritative) ----
    const { data: round } = await admin
      .from("rounds")
      .select("*")
      .eq("id", round_id)
      .maybeSingle();

    if (!round || round.status !== "open") {
      return json({ error: "This round is not open for purchases." }, 400);
    }
    if (new Date() > new Date(round.closes_at)) {
      return json({ error: "Purchase window has closed for this round." }, 400);
    }

    // ---- 3. Config + limits ----
    const { data: config } = await admin
      .from("game_config")
      .select("*")
      .eq("id", 1)
      .single();

    const count = tickets_requested.length;

    if (count > config.max_tickets_per_purchase) {
      return json(
        { error: `You can buy at most ${config.max_tickets_per_purchase} tickets per purchase.` },
        400
      );
    }

    const { count: roundCount } = await admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("round_id", round_id)
      .eq("user_id", userId);

    if ((roundCount ?? 0) + count > profile.round_ticket_limit) {
      return json({ error: "Round ticket limit exceeded." }, 400);
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: dailyCount } = await admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("purchased_at", startOfDay.toISOString());

    if ((dailyCount ?? 0) + count > profile.daily_ticket_limit) {
      return json({ error: "Daily ticket limit exceeded." }, 400);
    }

    // ---- 4. Basic rate-limit / abuse guard ----
    // Flags rather than blocks, so admin can review without hard-locking
    // legitimate bulk buyers.
    const { count: recentPurchases } = await admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("purchased_at", new Date(Date.now() - 60_000).toISOString());

    if ((recentPurchases ?? 0) > 150) {
      await admin.from("fraud_flags").insert({
        user_id: userId,
        round_id,
        flag_type: "rate_limit_exceeded",
        severity: "high",
        details: { recentPurchases, ip_address, device_fingerprint },
      });
      return json({ error: "Too many requests. Please slow down." }, 429);
    }

    // ---- 5. Validate / generate numbers ----
    const digitCount = config.digit_count;
    const maxDigit = config.digit_range_max;

    const finalTickets = tickets_requested.map((t) => {
      let numbers = t.numbers;
      if (t.is_quick_pick || !numbers) {
        numbers = quickPick(digitCount, maxDigit);
      } else {
        if (!new RegExp(`^[0-${maxDigit}]{${digitCount}}$`).test(numbers)) {
          throw new Error(`Invalid number format: ${numbers}`);
        }
      }
      return { numbers, is_quick_pick: t.is_quick_pick || !t.numbers };
    });

    // ---- 6. Price with bulk discount ----
    const basePrice = config.ticket_price_ugx;
    const tiers = (config.bulk_discount_tiers as { min: number; discount: number }[])
      .sort((a, b) => b.min - a.min);
    const applicableTier = tiers.find((t) => count >= t.min);
    const discountPercent = applicableTier?.discount ?? 0;
    const pricePerTicket = Math.round(basePrice * (1 - discountPercent / 100));
    const totalPrice = pricePerTicket * count;

    // ---- 7. Insert tickets as pending approval ----
    // Money doesn't count toward the pool or ledger until an admin confirms
    // the player's merchant-code deposit actually landed (see the new
    // approve-ticket function). This just records the claim for now.
    const now = new Date().toISOString();
    const ticketRows = finalTickets.map((t) => ({
      round_id,
      user_id: userId,
      numbers: t.numbers,
      is_quick_pick: t.is_quick_pick,
      purchased_at: now,
      price_paid_ugx: pricePerTicket,
      external_payment_ref: external_payment_ref ?? null,
      deposit_network,
      ip_address,
      device_fingerprint: device_fingerprint ?? null,
      status: "pending_approval",
    }));

    const { data: insertedTickets, error: insertError } = await admin
      .from("tickets")
      .insert(ticketRows)
      .select("id, numbers");

    if (insertError) {
      return json({ error: "Could not record tickets: " + insertError.message }, 500);
    }

    await admin.from("audit_log").insert({
      actor_id: userId,
      actor_role: "player",
      action: "ticket_purchase_pending",
      target_type: "round",
      target_id: String(round_id),
      metadata: { count, totalPrice, deposit_network },
      ip_address,
    });

    return json({
      success: true,
      tickets: insertedTickets,
      total_price_ugx: totalPrice,
      price_per_ticket_ugx: pricePerTicket,
      discount_percent: discountPercent,
      pending_approval: true,
    });
  } catch (err) {
    return json({ error: String(err) }, 400);
  }
});

function quickPick(digitCount: number, maxDigit: number): string {
  const bytes = new Uint8Array(digitCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => (b % (maxDigit + 1)).toString())
    .join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
