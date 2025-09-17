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

const formatCurrency = (value: number, currency: string) => {
    const safeCurrency = typeof currency === 'string' && currency.trim().length === 3 ? currency : 'USD';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: safeCurrency, maximumFractionDigits: 2 }).format(value);
};

const formatDate = (value: string) => dayjs(value).format('MMM D, YYYY');

type InvoiceTableProps = {
    invoices: InvoiceRecord[];
    onUpdateStatus?: (id: string, status: InvoiceStatus) => void;
    onGeneratePdf?: (invoice: InvoiceRecord) => void;
    onCreateCheckout?: (invoice: InvoiceRecord) => void;
    generatingInvoiceId?: string | null;
    checkoutInvoiceId?: string | null;
};

export function InvoiceTable({
    invoices,
    onUpdateStatus,
    onGeneratePdf,
    onCreateCheckout,
    generatingInvoiceId,
    checkoutInvoiceId
}: InvoiceTableProps) {
    return (
        <div className="space-y-4">
            {invoices.map((invoice, index) => {
                const trimmedInvoiceId = typeof invoice.id === 'string' ? invoice.id.trim() : '';
                const invoiceKey = trimmedInvoiceId ? `invoice-${trimmedInvoiceId}` : `invoice-${index + 1}`;
                const invoiceNumberLabel = trimmedInvoiceId || `#${String(index + 1).padStart(3, '0')}`;
                const currency = typeof invoice.currency === 'string' && invoice.currency.trim().length === 3 ? invoice.currency : 'USD';
                const project = invoice.project ?? 'New project';
                const issueDateLabel = invoice.issueDate ? formatDate(invoice.issueDate) : '—';
                const dueDateLabel = invoice.dueDate ? formatDate(invoice.dueDate) : '—';
                const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
                const totals = invoice.totals ?? { subtotal: invoice.amount, taxTotal: 0, total: invoice.amount };
                const taxRate = Number.isFinite(invoice.taxRate) ? invoice.taxRate : 0;
                const outstandingAmount = invoice.status === 'Paid' ? 0 : invoice.amount;

                return (
                    <div
                        key={invoiceKey}
                        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Invoice {invoiceNumberLabel}
                                </p>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{invoice.client}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{project}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Issued {issueDateLabel}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-semibold text-slate-900 dark:text-white">
                                    {formatCurrency(invoice.amount, currency)}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Due {dueDateLabel}</p>
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
                                Balance {formatCurrency(outstandingAmount, currency)}
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
                                {onGeneratePdf ? (
                                    <button
                                        type="button"
                                        onClick={() => onGeneratePdf(invoice)}
                                        disabled={generatingInvoiceId === invoice.id}
                                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                    >
                                        {generatingInvoiceId === invoice.id
                                            ? 'Preparing…'
                                            : invoice.pdfUrl
                                              ? 'Regenerate PDF'
                                              : 'Generate PDF'}
                                    </button>
                                ) : null}
                                {onCreateCheckout && invoice.status !== 'Paid' ? (
                                    <button
                                        type="button"
                                        onClick={() => onCreateCheckout(invoice)}
                                        disabled={checkoutInvoiceId === invoice.id}
                                        className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                                    >
                                        {checkoutInvoiceId === invoice.id ? 'Starting checkout…' : 'Send payment link'}
                                    </button>
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
                        {lineItems.length > 0 ? (
                            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                    {lineItems.slice(0, 3).map((item) => (
                                        <li key={item.id} className="flex items-center justify-between gap-4">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{item.description}</span>
                                            <span>
                                                {item.quantity} × {formatCurrency(item.unitPrice, currency)} ={' '}
                                                <strong className="text-slate-900 dark:text-white">
                                                    {formatCurrency(item.total, currency)}
                                                </strong>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {lineItems.length > 3 ? (
                                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
                                        +{lineItems.length - 3} more line items
                                    </p>
                                ) : null}
                                <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center justify-between">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(totals.subtotal, currency)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Tax ({Math.round(taxRate * 100)}%)</span>
                                        <span>{formatCurrency(totals.taxTotal, currency)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-base font-semibold text-slate-900 dark:text-white">
                                        <span>Total</span>
                                        <span>{formatCurrency(totals.total, currency)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

export default InvoiceTable;
