"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function shadowEmail(phone: string) {
  return `${phone.replace(/[^0-9]/g, "")}@eziloto.local`;
}

export default function LoginPage() {
  const [mode, setMode] = useState<"password" | "otp">("password");
  const router = useRouter();

  return (
    <div className="max-w-sm mx-auto mt-10 sm:mt-16 px-1">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="font-display text-3xl font-extrabold text-ezgold">
          {mode === "password" ? "Welcome back" : "Verify your code"}
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          {mode === "password"
            ? "Log in with your phone number and password."
            : "Enter the phone number and code your EziLoto agent gave you."}
        </p>
      </div>

      <div className="flex rounded-full bg-ezblacksoft border border-ezgolddeep/30 p-1 mb-4 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`flex-1 rounded-full py-2 transition-colors ${
            mode === "password" ? "bg-ezgold text-ezblack" : "text-zinc-400"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("otp")}
          className={`flex-1 rounded-full py-2 transition-colors ${
            mode === "otp" ? "bg-ezgold text-ezblack" : "text-zinc-400"
          }`}
        >
          First time / reset
        </button>
      </div>

      {mode === "password" ? (
        <PasswordForm onNeedOtp={() => setMode("otp")} />
      ) : (
        <OtpForm
          onVerified={() => {
            router.push("/login/set-password");
          }}
        />
      )}
    </div>
  );
}

function PasswordForm({ onNeedOtp }: { onNeedOtp: () => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: shadowEmail(phone),
      password,
    });

    if (signInError) {
      setError(
        "Incorrect phone or password. If this is your first time, use \"First time / reset\" below."
      );
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-ezblacksoft border border-ezgolddeep/30 rounded-2xl p-5 sm:p-6 space-y-4 gold-glow"
    >
      <div>
        <label className="text-xs uppercase tracking-wide text-zinc-400">Phone number</label>
        <input
          type="tel"
          required
          placeholder="+256 700 000 000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-lg bg-ezblack border border-zinc-700 px-3 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ezgold"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-zinc-400">Password</label>
        <input
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg bg-ezblack border border-zinc-700 px-3 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ezgold"
        />
      </div>

      {error && <p className="text-ezred text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-ezgold hover:bg-ezgoldbright transition-colors text-ezblack font-bold py-3 disabled:opacity-60"
      >
        {loading ? "Logging in..." : "Log in"}
      </button>

      <button
        type="button"
        onClick={onNeedOtp}
        className="w-full text-xs text-zinc-500 text-center underline decoration-dotted"
      >
        Forgot your password, or logging in for the first time?
      </button>
    </form>
  );
}

function OtpForm({ onVerified }: { onVerified: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed. Check your code and try again.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const url = new URL(data.action_link);
      const token_hash = url.searchParams.get("token") ?? url.searchParams.get("token_hash");

      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: token_hash ?? "",
      });

      if (verifyError) {
        setError("Could not start your session. Please try again.");
        setLoading(false);
        return;
      }

      onVerified();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-ezblacksoft border border-ezgolddeep/30 rounded-2xl p-5 sm:p-6 space-y-4 gold-glow"
    >
      <div>
        <label className="text-xs uppercase tracking-wide text-zinc-400">Phone number</label>
        <input
          type="tel"
          required
          placeholder="+256 700 000 000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-lg bg-ezblack border border-zinc-700 px-3 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-ezgold"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-zinc-400">6-digit code</label>
        <input
          type="text"
          required
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded-lg bg-ezblack border border-zinc-700 px-3 py-2.5 text-zinc-100 tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-ezgold"
        />
      </div>

      {error && <p className="text-ezred text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-ezgold hover:bg-ezgoldbright transition-colors text-ezblack font-bold py-3 disabled:opacity-60"
      >
        {loading ? "Checking..." : "Verify code"}
      </button>

      <p className="text-xs text-zinc-500 text-center">
        Don't have a code? Ask your EziLoto agent to set up your account.
      </p>
    </form>
  );
}
