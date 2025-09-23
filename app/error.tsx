'use client';
export default function Error({
  error,
  reset,
}: { error: unknown; reset: () => void }) {
  return (
    <div className="p-6 text-red-300">
      <h2 className="mb-2 text-lg font-semibold">This page crashed</h2>
      <pre className="text-xs">{String((error as any)?.stack ?? error)}</pre>
      <button
        onClick={() => reset()}
        className="mt-3 rounded border border-white/10 px-3 py-1 text-sm"
      >
        Try again
      </button>
    </div>
  );
}
