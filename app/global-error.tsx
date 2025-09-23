'use client';

export default function GlobalError({
  error,
  reset,
}: { error: unknown; reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen bg-zinc-950 p-6 text-red-300">
        <h2 className="mb-2 text-lg font-semibold">App crashed</h2>
        <pre className="max-h-[50vh] overflow-auto rounded bg-black/40 p-3 text-xs">
{String((error as any)?.stack ?? error)}
        </pre>
        <button
          onClick={() => reset()}
          className="mt-4 rounded border border-white/10 px-3 py-1 text-sm text-white hover:bg-white/10"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
