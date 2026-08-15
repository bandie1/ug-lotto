"use client";

import { useEffect, useState } from "react";

export default function Countdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState("--:--:--");

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Drawing now...");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setRemaining(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className="flex justify-center gap-1 font-display text-3xl font-extrabold text-ezgoldbright tabular-nums">
      {remaining.split("").map((ch, i) =>
        ch === ":" ? (
          <span key={i} className="text-ezgold">
            :
          </span>
        ) : (
          <span
            key={i}
            className="bg-ezblacksoft border border-ezgolddeep/40 rounded px-2 py-1"
          >
            {ch}
          </span>
        )
      )}
    </div>
  );
}
