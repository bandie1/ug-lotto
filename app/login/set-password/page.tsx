"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // This page only makes sense right after a valid OTP verification, which
  // leaves a live Supabase session. If someone lands here without one,
  // bounce them back to login.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("Could not set your password. Please try again.");
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from("profiles").update({ has_password: true }).eq("id", userData.user.id);
    }

    router.push("/");
    router.refresh();
  }

  if (checking) return null;

  return (
    <div className="max-w-sm mx-auto mt-10 sm:mt-16 px-1">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🔐</div>
        <h1 className="font-display text-3xl font-extrabold text-ezgold">Set your password</h1>
        <p className="text-zinc-400 text-sm mt-1">
          You're verified — now set a password so you can log in yourself next time.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-ezblacksoft border border-ezgolddeep/30 rounded-2xl p-5 sm:p-6 space-y-4 gold-glow"
      >
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-400">New password</label>
          <input
            type="password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg bg-ezblack border border-zinc-700 px-3 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ezgold"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-400">Confirm password</label>
          <input
            type="password"
            required
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg bg-ezblack border border-zinc-700 px-3 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ezgold"
          />
        </div>

        {error && <p className="text-ezred text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-ezgold hover:bg-ezgoldbright transition-colors text-ezblack font-bold py-3 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save password & continue"}
        </button>
      </form>
    </div>
  );
}
