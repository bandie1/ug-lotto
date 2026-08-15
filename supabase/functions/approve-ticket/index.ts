// supabase/functions/approve-ticket/index.ts
// Admin-only. Approving a pending_approval ticket is the moment its money
// actually counts: this is where the ledger entry and round pool credit
// happen, not at purchase time (purchase just records the player's claim).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing auth token." }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerData, error: callerError } = await admin.auth.getUser(jwt);
    if (callerError || !callerData.user) return json({ error: "Invalid session." }, 401);

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", callerData.user.id)
      .maybeSingle();
    if (!callerProfile?.is_admin) return json({ error: "Admins only." }, 403);

    const { ticket_id, action } = await req.json();
    if (!ticket_id || !["approve", "reject"].includes(action)) {
      return json({ error: "ticket_id and a valid action are required." }, 400);
    }

    const { data: ticket } = await admin
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .maybeSingle();

    if (!ticket) return json({ error: "Ticket not found." }, 404);
    if (ticket.status !== "pending_approval") {
      return json({ error: `Ticket is already ${ticket.status}, not pending.` }, 400);
    }

    if (action === "reject") {
      await admin.from("tickets").update({ status: "rejected" }).eq("id", ticket_id);

      await admin.from("audit_log").insert({
        actor_id: callerData.user.id,
        actor_role: "admin",
        action: "ticket_rejected",
        target_type: "ticket",
        target_id: ticket_id,
      });

      return json({ success: true, status: "rejected" });
    }

    // action === "approve"
    const { data: round } = await admin
      .from("rounds")
      .select("total_pool_ugx")
      .eq("id", ticket.round_id)
      .single();

    await admin.from("tickets").update({ status: "valid" }).eq("id", ticket_id);

    await admin.from("ledger_entries").insert({
      entry_type: "ticket_sale",
      round_id: ticket.round_id,
      user_id: ticket.user_id,
      amount_ugx: ticket.price_paid_ugx,
      reference: ticket.external_payment_ref,
      notes: `Approved deposit (${ticket.deposit_network ?? "unknown network"})`,
      created_by: callerData.user.id,
    });

    await admin
      .from("rounds")
      .update({ total_pool_ugx: (round?.total_pool_ugx ?? 0) + ticket.price_paid_ugx })
      .eq("id", ticket.round_id);

    await admin.from("audit_log").insert({
      actor_id: callerData.user.id,
      actor_role: "admin",
      action: "ticket_approved",
      target_type: "ticket",
      target_id: ticket_id,
      metadata: { amount_ugx: ticket.price_paid_ugx },
    });

    return json({ success: true, status: "valid" });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
