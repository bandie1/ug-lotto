"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  phone: string;
  display_name: string | null;
  status: string;
  daily_ticket_limit: number;
  round_ticket_limit: number;
  created_at: string;
};

export default function AdminUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [otpResult, setOtpResult] = useState<{ phone: string; code: string; expires_at: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
  }, [search]);

  async function load() {
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
    if (search) query = query.ilike("phone", `%${search}%`);
    const { data } = await query;
    setUsers((data as any) ?? []);
  }

  async function generateOtp(phone: string, display_name?: string) {
    setBusy(true);
    setOtpResult(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ phone, display_name }),
      }
    );
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setOtpResult({ phone, code: data.code, expires_at: data.expires_at });
      setNewPhone("");
      setNewName("");
      load();
    } else {
      alert(data.error);
    }
  }

  async function toggleStatus(u: Profile) {
    const newStatus = u.status === "active" ? "suspended" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("id", u.id);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ezgold">Users & OTP</h1>

      {/* Add new player / generate OTP */}
      <div className="bg-ezblacksoft border border-ezgolddeep/30 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">Add player / generate OTP</h2>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Phone e.g. +256700000000"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg bg-ezblack border border-zinc-700 px-3 py-2"
          />
          <input
            placeholder="Display name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[160px] rounded-lg bg-ezblack border border-zinc-700 px-3 py-2"
          />
          <button
            disabled={busy || !newPhone}
            onClick={() => generateOtp(newPhone, newName)}
            className="bg-ezgold text-ezblack font-bold rounded-lg px-4 py-2 disabled:opacity-50"
          >
            Generate Code
          </button>
        </div>
        {otpResult && (
          <div className="bg-ezgreen/20 border border-ezgreen rounded-lg p-3 text-sm">
            Code for <b>{otpResult.phone}</b>: <span className="font-display text-xl tracking-widest text-ezgoldbright">{otpResult.code}</span>
            <p className="text-xs text-zinc-400 mt-1">
              Expires {new Date(otpResult.expires_at).toLocaleTimeString()}. Relay this to the player yourself (WhatsApp/SMS/call).
            </p>
          </div>
        )}
      </div>

      {/* Search + list */}
      <input
        placeholder="Search by phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg bg-ezblack border border-zinc-700 px-3 py-2"
      />

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-ezblacksoft border border-zinc-800 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-medium">{u.phone} {u.display_name && `— ${u.display_name}`}</p>
              <p className="text-xs text-zinc-500">
                Status: <span className={u.status === "active" ? "text-ezgreen" : "text-ezred"}>{u.status}</span>
                {" · "}Limits: {u.daily_ticket_limit}/day, {u.round_ticket_limit}/round
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => generateOtp(u.phone)}
                className="text-xs bg-ezgold text-ezblack rounded-full px-3 py-1.5 font-semibold"
              >
                New OTP
              </button>
              <button
                onClick={() => toggleStatus(u)}
                className="text-xs bg-zinc-700 rounded-full px-3 py-1.5 font-semibold"
              >
                {u.status === "active" ? "Suspend" : "Reactivate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
