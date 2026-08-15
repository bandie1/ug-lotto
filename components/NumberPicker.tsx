"use client";

import { useState } from "react";

export function generateQuickPick(): string {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join("");
}

export default function NumberPicker({
  value,
  onChange,
}: {
  value: string; // up to 6 chars, digits only
  onChange: (v: string) => void;
}) {
  const digits = value.padEnd(6, " ").split("");

  function setDigit(index: number, d: string) {
    const arr = value.padEnd(6, " ").split("");
    arr[index] = d;
    onChange(arr.join("").replace(/ /g, ""));
  }

  return (
    <div className="flex gap-1.5 xs:gap-2 justify-center">
      {digits.map((d, i) => (
        <select
          key={i}
          value={d.trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          className={`lotto-ball ${d.trim() ? "filled" : ""} w-10 h-10 sm:w-12 sm:h-12 rounded-full text-center font-display font-extrabold text-base sm:text-lg appearance-none cursor-pointer`}
        >
          <option value="" disabled>
            —
          </option>
          {Array.from({ length: 10 }, (_, n) => n).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
