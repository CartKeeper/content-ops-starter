import * as React from 'react';
import dayjs from 'dayjs';

import StatusPill, { StatusTone } from './StatusPill';

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
                <div key={invoice.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Invoice {invoice.id}</p>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{invoice.client}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{invoice.project}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(invoice.amount)}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Due {formatDate(invoice.dueDate)}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <StatusPill tone={statusToneMap[invoice.status]}>{invoice.status}</StatusPill>
                        <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">View invoice</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default InvoiceTable;
