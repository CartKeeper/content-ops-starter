import type { GetStaticProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { CRMLayout } from '../../components/crm/CRMLayout';
import { InvoiceForm } from '../../components/crm/InvoiceForm';
import type { Client, Invoice } from '../../lib/mock-data';
import { createInvoice, getClients, getInvoices } from '../../lib/api';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

type InvoicesPageProps = {
    invoices: Invoice[];
    clients: Client[];
};

type InvoiceStatusStyle = {
    label: string;
    className: string;
};

const STATUS_STYLES: Record<Invoice['status'], InvoiceStatusStyle> = {
    draft: { label: 'Draft', className: 'bg-slate-800 text-slate-200' },
    sent: { label: 'Sent', className: 'bg-emerald-500/10 text-emerald-200' },
    paid: { label: 'Paid', className: 'bg-emerald-500 text-slate-900' },
    overdue: { label: 'Overdue', className: 'bg-rose-500 text-white' }
};

export default function InvoicesPage({ invoices: initialInvoices, clients }: InvoicesPageProps) {
    const [invoices, setInvoices] = useState(initialInvoices);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    async function handleCreateInvoice(payload: Parameters<typeof createInvoice>[0]) {
        const newInvoice = await createInvoice(payload);
        setInvoices((prev) => [...prev, newInvoice]);
        const client = clients.find((item) => item.id === newInvoice.clientId);
        setStatusMessage(`Draft invoice ${newInvoice.id} created for ${client?.name ?? 'client'}.`);
        setTimeout(() => setStatusMessage(null), 4000);
    }

    return (
        <CRMLayout
            title="Invoice Management"
            description="Send branded invoices, track payment status and keep your cash flow predictable."
            actions={
                <Link
                    href="/clients"
                    className="inline-flex items-center rounded-lg border border-emerald-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300 transition hover:border-emerald-300 hover:text-emerald-200"
                >
                    View clients
                </Link>
            }
        >
            <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Invoices</h2>
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{invoices.length} total</span>
                    </div>
                    <div className="space-y-4">
                        {invoices.map((invoice) => {
                            const client = clients.find((item) => item.id === invoice.clientId);
                            const style = STATUS_STYLES[invoice.status];
                            return (
                                <article
                                    key={invoice.id}
                                    className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 shadow-lg shadow-slate-950/40"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{client?.name ?? 'Unknown client'}</p>
                                            <p className="text-xs text-slate-400">{invoice.description ?? 'Invoice details coming soon'}</p>
                                        </div>
                                        <div className="text-right text-xs text-slate-400">
                                            <p className="text-lg font-semibold text-white">{formatCurrency(invoice.amount)}</p>
                                            <p>Due {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(invoice.dueDate))}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-xs">
                                        <span
                                            className={`inline-flex items-center rounded-full px-3 py-1 font-semibold uppercase tracking-[0.3em] ${style.className}`}
                                        >
                                            {style.label}
                                        </span>
                                        <div className="flex gap-2 text-emerald-300">
                                            <button className="rounded-full border border-emerald-500/40 px-3 py-1 hover:border-emerald-300 hover:text-emerald-200">
                                                Download PDF
                                            </button>
                                            <button className="rounded-full border border-emerald-500/40 px-3 py-1 hover:border-emerald-300 hover:text-emerald-200">
                                                Send reminder
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
                <div className="space-y-4">
                    <InvoiceForm clients={clients} onSubmit={handleCreateInvoice} />
                    {statusMessage && (
                        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-xs text-emerald-200">
                            {statusMessage}
                        </p>
                    )}
                </div>
            </section>
        </CRMLayout>
    );
}

export const getStaticProps: GetStaticProps<InvoicesPageProps> = async () => {
    const [invoicesData, clientsData] = await Promise.all([getInvoices(), getClients()]);
    return {
        props: {
            invoices: invoicesData,
            clients: clientsData
        }
    };
};
