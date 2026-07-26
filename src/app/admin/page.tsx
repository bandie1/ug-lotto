'use client';

import { useState } from 'react';

export default function AdminPortal() {
  const [customDigits, setCustomDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleExecuteDraw = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/lottery/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winningDigits: customDigits.length === 6 ? customDigits : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.drawResult);
    } catch (err: any) {
      alert(`Draw Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Admin Control Panel</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Custom Winning Digits (Optional - 6 Digits)
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 481093 (Leave blank for random)"
              value={customDigits}
              onChange={(e) => setCustomDigits(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-200"
            />
          </div>

          <button
            onClick={handleExecuteDraw}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold gold-gradient text-zinc-950 hover:brightness-110 disabled:opacity-50"
          >
            {loading ? 'Executing Draw Engine...' : 'Execute Round Draw'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-zinc-900 border border-yellow-500/30 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold gold-text">Draw Results</h3>
          <p className="text-zinc-300">
            Winning Digits: <span className="font-mono text-xl text-yellow-400 font-bold">{result.winningDigits}</span>
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 block">Gross Sales</span>
              <span className="font-bold">${result.financials.grossSales.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 block">20% Admin Revenue</span>
              <span className="font-bold text-green-400">${result.financials.adminFee.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 block">Rollover to Next Round</span>
              <span className="font-bold text-yellow-400">${result.financials.nextRollover.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}