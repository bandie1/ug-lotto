// supabase/functions/generate-otp/index.ts
// Called from the Admin dashboard only. Requires the caller's JWT to belong
// to a profile with is_admin = true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    // Confirm the caller is an admin
    const { data: callerData, error: callerError } =
      await admin.auth.getUser(jwt);
    if (callerError || !callerData.user) {
      return json({ error: "Invalid session." }, 401);
    }

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", callerData.user.id)
      .maybeSingle();

    if (!callerProfile?.is_admin) {
      return json({ error: "Admins only." }, 403);
    }

    const { phone, display_name } = await req.json();
    if (!phone) return json({ error: "Phone is required." }, 400);

    // Ensure a profile exists for this phone (create if new player)
    let { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (!profile) {
      const { data: newUser, error: createError } =
        await admin.auth.admin.createUser({ phone, phone_confirm: true });
      if (createError || !newUser.user) {
        return json({ error: "Could not create player account." }, 500);
      }
      const { data: inserted } = await admin
        .from("profiles")
        .insert({
          id: newUser.user.id,
          phone,
          display_name: display_name ?? null,
          status: "active",
        })
        .select("id")
        .single();
      profile = inserted;
    }

    // Generate a 6-digit code, valid for 10 minutes
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await admin.from("otp_codes").insert({
      phone,
      code,
      created_by: callerData.user.id,
      expires_at: expiresAt,
    });

    await admin.from("audit_log").insert({
      actor_id: callerData.user.id,
      actor_role: "admin",
      action: "otp_generated",
      target_type: "profile",
      target_id: profile?.id,
      metadata: { phone },
    });

    return json({ success: true, code, expires_at: expiresAt });
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
