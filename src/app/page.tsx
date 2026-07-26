import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-4xl md:text-6xl font-extrabold gold-text mb-4">
        6-Digit Sequential Lottery
      </h1>
      <p className="text-zinc-400 max-w-xl mb-8">
        Match numbers from left to right to share in the gold prize pool. Unwon brackets rollover to the next round automatically.
      </p>
      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-xl font-bold gold-gradient text-zinc-950 hover:brightness-110 transition"
        >
          Enter User Dashboard
        </Link>
        <Link
          href="/admin"
          className="px-6 py-3 rounded-xl font-bold bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition"
        >
          Admin Management
        </Link>
      </div>
    </div>
  );
}