import { useState } from 'react';
import type { Client } from '../../lib/mock-data';
import type { CreateInvoiceInput } from '../../lib/api';

type InvoiceFormProps = {
    clients: Client[];
    onSubmit: (invoice: CreateInvoiceInput) => Promise<void> | void;
};

export function InvoiceForm({ clients, onSubmit }: InvoiceFormProps) {
    const [formState, setFormState] = useState<CreateInvoiceInput>({
        clientId: clients[0]?.id ?? '',
        amount: 0,
        dueDate: new Date().toISOString().slice(0, 10),
        description: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit(formState);
            setFormState((prev) => ({ ...prev, amount: 0, description: '' }));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    Client
                    <select
                        className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={formState.clientId}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                clientId: event.target.value
                            }))
                        }
                        required
                    >
                        {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                                {client.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    Amount
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={formState.amount}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                amount: Number(event.target.value)
                            }))
                        }
                        required
                    />
                </label>
                <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                    Due Date
                    <input
                        type="date"
                        className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={formState.dueDate}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                dueDate: event.target.value
                            }))
                        }
                        required
                    />
                </label>
                <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400 sm:col-span-2">
                    Description
                    <textarea
                        className="h-24 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={formState.description}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                description: event.target.value
                            }))
                        }
                        placeholder="Describe deliverables, payment schedule or notes"
                    />
                </label>
            </div>
            <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-600/40"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Creating invoice...' : 'Create invoice'}
            </button>
        </form>
    );
}
