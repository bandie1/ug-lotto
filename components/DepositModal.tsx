"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

type Network = "mtn" | "airtel";

const NETWORK_INFO: Record<
  Network,
  { label: string; color: string; merchantCode: string; ussd: string }
> = {
  mtn: { label: "MTN Mobile Money", color: "bg-yellow-400 text-black", merchantCode: "770376", ussd: "*165*3#" },
  airtel: { label: "Airtel Money", color: "bg-red-600 text-white", merchantCode: "1337749", ussd: "*185*9#" },
};

export default function DepositModal({
  totalUgx,
  submitting,
  onCancel,
  onConfirm,
}: {
  totalUgx: number;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (network: Network) => void;
}) {
  const { showToast } = useToast();
  const [network, setNetwork] = useState<Network | null>(null);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(
      () => showToast("Merchant code copied.", "success"),
      () => showToast("Could not copy — long-press the code to copy manually.", "error")
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative w-full sm:max-w-sm bg-ezblacksoft border border-ezgolddeep/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto gold-glow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-extrabold text-ezgold">
            {network ? NETWORK_INFO[network].label : "Choose your network"}
          </h2>
          <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-200 text-lg leading-none">
            ✕
          </button>
        </div>

        {!network ? (
          <>
            <p className="text-sm text-zinc-400 mb-4">
              Select the mobile money network you'll deposit UGX {totalUgx.toLocaleString()} from.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["mtn", "airtel"] as Network[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setNetwork(n)}
                  className={`rounded-2xl py-6 font-bold text-sm ${NETWORK_INFO[n].color} hover:opacity-90 transition-opacity`}
                >
                  {NETWORK_INFO[n].label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Send UGX {totalUgx.toLocaleString()} using either method below, then confirm.
            </p>

            <div className="bg-ezblack border border-zinc-700 rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Merchant code</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-2xl font-extrabold text-ezgoldbright tracking-widest">
                  {NETWORK_INFO[network].merchantCode}
                </span>
                <button
                  onClick={() => copyCode(NETWORK_INFO[network].merchantCode)}
                  className="text-xs bg-ezgold text-ezblack font-semibold rounded-full px-3 py-1.5 shrink-0"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Enter this in your mobile money app's "Pay Merchant" / "Pay Bill" option.
              </p>
            </div>

            <div className="bg-ezblack border border-zinc-700 rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">USSD code</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-2xl font-extrabold text-ezgoldbright tracking-widest">
                  {NETWORK_INFO[network].ussd}
                </span>
                <a
                  href={`tel:${encodeURIComponent(NETWORK_INFO[network].ussd)}`}
                  className="text-xs bg-ezgold text-ezblack font-semibold rounded-full px-3 py-1.5 shrink-0"
                >
                  Dial
                </a>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Or tap "Dial" to open your phone's dialer with this USSD code ready to send — it opens your
                mobile money menu directly, no need to type it yourself.
              </p>
            </div>

            <button
              onClick={() => setNetwork(null)}
              className="text-xs text-zinc-500 underline decoration-dotted"
            >
              ← Choose a different network
            </button>

            <button
              onClick={() => onConfirm(network)}
              disabled={submitting}
              className="w-full rounded-xl bg-ezgold hover:bg-ezgoldbright text-ezblack font-bold py-3.5 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Submitting..." : "I've made the deposit — Submit"}
            </button>
            <p className="text-xs text-zinc-500 text-center">
              Your tickets will show as pending until an EziLoto agent confirms the deposit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
