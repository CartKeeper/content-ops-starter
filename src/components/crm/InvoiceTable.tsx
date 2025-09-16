import * as React from 'react';
import dayjs from 'dayjs';

import StatusPill, { StatusTone } from './StatusPill';
import type { InvoiceRecord, InvoiceStatus } from '../../types/invoice';

const statusToneMap: Record<InvoiceStatus, StatusTone> = {
    Draft: 'neutral',
    Paid: 'success',
    Sent: 'info',
    Overdue: 'danger'
};

const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

const formatDate = (value: string) => dayjs(value).format('MMM D, YYYY');

type InvoiceTableProps = {
    invoices: InvoiceRecord[];
    onUpdateStatus?: (id: string, status: InvoiceStatus) => void;
};

export function InvoiceTable({ invoices, onUpdateStatus }: InvoiceTableProps) {
    return (
        <div className="space-y-4">
            {invoices.map((invoice) => (
                <div
                    key={invoice.id}
                    className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Invoice {invoice.id}
                            </p>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{invoice.client}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{invoice.project}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Issued {formatDate(invoice.issueDate)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(invoice.amount, invoice.currency)}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Due {formatDate(invoice.dueDate)}</p>
                            {invoice.paymentLink ? (
                                <a
                                    href={invoice.paymentLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                                >
                                    Pay online
                                </a>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <StatusPill tone={statusToneMap[invoice.status]}>{invoice.status}</StatusPill>
                        <span className="text-slate-500 dark:text-slate-400">
                            Balance {formatCurrency(invoice.status === 'Paid' ? 0 : invoice.amount, invoice.currency)}
                        </span>
                        <div className="ml-auto flex flex-wrap gap-3 text-sm font-semibold">
                            {invoice.pdfUrl ? (
                                <a
                                    href={invoice.pdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[#4534FF] transition hover:bg-slate-100 dark:border-slate-700 dark:text-[#9DAAFF] dark:hover:bg-slate-800"
                                >
                                    Download PDF
                                </a>
                            ) : null}
                            <button className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                View details
                            </button>
                        </div>
                    </div>
                    {onUpdateStatus ? (
                        <div className="flex flex-wrap gap-2">
                            {invoice.status === 'Draft' || invoice.status === 'Overdue' ? (
                                <button
                                    type="button"
                                    onClick={() => onUpdateStatus(invoice.id, 'Sent')}
                                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                                >
                                    Mark sent
                                </button>
                            ) : null}
                            {invoice.status === 'Sent' ? (
                                <button
                                    type="button"
                                    onClick={() => onUpdateStatus(invoice.id, 'Overdue')}
                                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                                >
                                    Mark overdue
                                </button>
                            ) : null}
                            {invoice.status === 'Sent' || invoice.status === 'Overdue' ? (
                                <button
                                    type="button"
                                    onClick={() => onUpdateStatus(invoice.id, 'Paid')}
                                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                                >
                                    Mark paid
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    {invoice.lineItems.length > 0 ? (
                        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                {invoice.lineItems.slice(0, 3).map((item) => (
                                    <li key={item.id} className="flex items-center justify-between gap-4">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{item.description}</span>
                                        <span>
                                            {item.quantity} × {formatCurrency(item.unitPrice, invoice.currency)} ={' '}
                                            <strong className="text-slate-900 dark:text-white">
                                                {formatCurrency(item.total, invoice.currency)}
                                            </strong>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {invoice.lineItems.length > 3 ? (
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
                                    +{invoice.lineItems.length - 3} more line items
                                </p>
                            ) : null}
                            <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                                <div className="flex items-center justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(invoice.totals.subtotal, invoice.currency)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Tax ({Math.round(invoice.taxRate * 100)}%)</span>
                                    <span>{formatCurrency(invoice.totals.taxTotal, invoice.currency)}</span>
                                </div>
                                <div className="flex items-center justify-between text-base font-semibold text-slate-900 dark:text-white">
                                    <span>Total</span>
                                    <span>{formatCurrency(invoice.totals.total, invoice.currency)}</span>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

export default InvoiceTable;
