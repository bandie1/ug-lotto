// supabase/functions/verify-otp/index.ts
// Verifies an admin-generated OTP and returns a Supabase session for the player.
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
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return json({ error: "Phone and code are required." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Find a matching, unused, unexpired OTP
    const { data: otp, error: otpError } = await admin
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otp) {
      return json({ error: "Invalid or expired code." }, 401);
    }

    // 2. Find or create the auth user + profile for this phone
    let userId: string;
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Admin should normally have pre-created the profile when issuing the
      // OTP, but we fall back to creating one here so the flow never breaks.
      const { data: newUser, error: createError } =
        await admin.auth.admin.createUser({
          phone,
          phone_confirm: true,
        });
      if (createError || !newUser.user) {
        return json({ error: "Could not create account." }, 500);
      }
      userId = newUser.user.id;

      await admin.from("profiles").insert({
        id: userId,
        phone,
        status: "active",
      });
    }

    // 3. Mark OTP as used
    await admin
      .from("otp_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otp.id);

    // 4. Issue a session via a magic link token exchange
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: `${phone.replace(/[^0-9]/g, "")}@eziloto.local`,
      });

    // NOTE: Supabase Auth is phone/email-centric. The simplest reliable
    // approach for a fully admin-issued OTP flow is to keep a shadow email
    // per phone number (e.g. 256700000000@eziloto.local) tied 1:1 to the
    // profile, and sign the session in using that. This keeps the OTP UX
    // entirely custom (your own otp_codes table) while still using Supabase
    // Auth sessions under the hood.
    if (linkError) {
      return json({ error: "Could not create session." }, 500);
    }

    await admin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);

    await admin.from("audit_log").insert({
      actor_id: userId,
      actor_role: "player",
      action: "login_success",
      target_type: "profile",
      target_id: userId,
    });

    return json({
      success: true,
      action_link: linkData.properties.action_link,
      user_id: userId,
    });
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
