'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="p-6">
            <h2 className="text-lg font-semibold">Contacts crashed.</h2>
            <p className="mt-2 text-sm opacity-75">{error.message}</p>
            <button className="mt-4 rounded border px-3 py-2" onClick={() => reset()}>
                Try again
            </button>
        </div>
    );
}
