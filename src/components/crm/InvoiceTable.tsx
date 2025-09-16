import * as React from 'react';
import dayjs from 'dayjs';

import StatusPill, { StatusTone } from './StatusPill';
import { CRM_BRAND_ACCENT_GLOW, CRM_BRAND_ACCENT_GLOW_SOFT } from './theme';

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export type InvoiceRecord = {
    id: string;
    client: string;
    project: string;
    amount: number;
    dueDate: string;
    status: InvoiceStatus;
    customFields?: Record<string, string | boolean>;
};

const statusToneMap: Record<InvoiceStatus, StatusTone> = {
    Draft: 'neutral',
    Paid: 'success',
    Sent: 'info',
    Overdue: 'danger'
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string) => dayjs(value).format('MMM D, YYYY');

export function InvoiceTable({ invoices }: { invoices: InvoiceRecord[] }) {
    return (
        <div className="space-y-4">
            {invoices.map((invoice) => (
                <div
                    key={invoice.id}
                    className="relative overflow-hidden rounded-xl border border-white/30 bg-white/75 p-4 shadow-sm backdrop-blur-lg transition dark:border-white/10 dark:bg-[#0d1c33]/70"
                >
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full blur-3xl"
                        style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW}, transparent 70%)` }}
                    />
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-16 left-10 h-44 w-44 rounded-full blur-3xl"
                        style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW_SOFT}, transparent 75%)` }}
                    />
                    <div className="relative z-10 flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#5EEAD4]">Invoice {invoice.id}</p>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">{invoice.client}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{invoice.project}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(invoice.amount)}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Due {formatDate(invoice.dueDate)}</p>
                        </div>
                    </div>
                    <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3">
                        <StatusPill tone={statusToneMap[invoice.status]}>{invoice.status}</StatusPill>
                        <button className="text-sm font-semibold text-[#0F766E] transition hover:text-[#0d8a80] dark:text-[#5EEAD4] dark:hover:text-[#7df7e0]">
                            View invoice
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default InvoiceTable;
