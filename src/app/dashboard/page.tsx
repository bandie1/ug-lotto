'use client';

import { useState } from 'react';

export default function UserDashboard() {
  const [ticketQty, setTicketQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Example Action Handler
  const handleBuy = async () => {
    setLoading(true);
    setMsg('');
    try {
      // Mock User ID for demonstration
      const res = await fetch('/api/lottery/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'alice-id', quantity: ticketQty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`Successfully bought ${ticketQty} ticket(s)!`);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-yellow-500/30 rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold gold-text mb-2">Buy Tickets</h2>
        <p className="text-sm text-zinc-400 mb-4">$5.00 per Ticket • Auto-generated 6-digit combinations</p>
        
        <div className="flex items-center gap-4 mb-4">
          <input
            type="number"
            min="1"
            max="100"
            value={ticketQty}
            onChange={(e) => setTicketQty(Number(e.target.value))}
            className="w-24 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-center text-yellow-400 font-bold focus:outline-none"
          />
          <button
            onClick={handleBuy}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-bold gold-gradient text-zinc-950 hover:brightness-110 disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Buy ${ticketQty} Ticket(s) ($${ticketQty * 5})`}
          </button>
        </div>
        {msg && <p className="text-sm text-yellow-400 mt-2">{msg}</p>}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-zinc-200 mb-4">Prize Pool Allocation Rules</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
            <span className="text-zinc-400 block">Match First 1</span>
            <span className="font-bold gold-text">2%</span>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
            <span className="text-zinc-400 block">Match First 2</span>
            <span className="font-bold gold-text">3%</span>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
            <span className="text-zinc-400 block">Match First 3</span>
            <span className="font-bold gold-text">5%</span>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
            <span className="text-zinc-400 block">Match First 4</span>
            <span className="font-bold gold-text">10%</span>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
            <span className="text-zinc-400 block">Match First 5</span>
            <span className="font-bold gold-text">20%</span>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
            <span className="text-zinc-400 block">Match All 6</span>
            <span className="font-bold gold-text">40%</span>
          </div>
        </div>
      </div>
    </div>
  );
}