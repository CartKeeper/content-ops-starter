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
    allowCheckout?: boolean;
};

export function InvoiceTable({
    invoices,
    onUpdateStatus,
    onGeneratePdf,
    onCreateCheckout,
    generatingInvoiceId,
    checkoutInvoiceId,
    allowCheckout = true
}: InvoiceTableProps) {
    const checkoutAllowed = allowCheckout !== false;

    return (
        <div className="d-grid gap-3">
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
                    <div key={invoiceKey} className="card card-stacked">
                        <div className="card-body">
                            <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                                <div>
                                    <div className="text-uppercase text-secondary fw-semibold small">Invoice {invoiceNumberLabel}</div>
                                    <h3 className="h4 mb-1">{invoice.client}</h3>
                                    <div className="text-secondary">{project}</div>
                                    <div className="text-secondary small">Issued {issueDateLabel}</div>
                                </div>
                                <div className="text-end">
                                    <div className="h3 mb-1">{formatCurrency(invoice.amount, currency)}</div>
                                    <div className="text-secondary">Due {dueDateLabel}</div>
                                    {invoice.paymentLink ? (
                                        <a href={invoice.paymentLink} target="_blank" rel="noreferrer" className="btn btn-sm btn-success mt-2">
                                            Pay online
                                        </a>
                                    ) : null}
                                </div>
                            </div>
                            <div className="d-flex flex-wrap align-items-center gap-3 mt-3">
                                <StatusPill tone={statusToneMap[invoice.status]}>{invoice.status}</StatusPill>
                                <span className="text-secondary">
                                    Balance {formatCurrency(outstandingAmount, currency)}
                                </span>
                                <div className="ms-auto d-flex flex-wrap gap-2">
                                    {invoice.pdfUrl ? (
                                        <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                                            Download PDF
                                        </a>
                                    ) : null}
                                    {onGeneratePdf ? (
                                        <button
                                            type="button"
                                            onClick={() => onGeneratePdf(invoice)}
                                            disabled={generatingInvoiceId === invoice.id}
                                            className="btn btn-sm btn-outline-secondary"
                                        >
                                            {generatingInvoiceId === invoice.id
                                                ? 'Preparing…'
                                                : invoice.pdfUrl
                                                    ? 'Regenerate PDF'
                                                    : 'Generate PDF'}
                                        </button>
                                    ) : null}
                                    {onCreateCheckout && checkoutAllowed && invoice.status !== 'Paid' ? (
                                        <button
                                            type="button"
                                            onClick={() => onCreateCheckout(invoice)}
                                            disabled={checkoutInvoiceId === invoice.id}
                                            className="btn btn-sm btn-outline-primary"
                                        >
                                            {checkoutInvoiceId === invoice.id ? 'Starting checkout…' : 'Send payment link'}
                                        </button>
                                    ) : null}
                                    <button type="button" className="btn btn-sm btn-link">
                                        View details
                                    </button>
                                </div>
                            </div>
                            {onUpdateStatus ? (
                                <div className="mt-3 d-flex flex-wrap gap-2">
                                    {invoice.status === 'Draft' || invoice.status === 'Overdue' ? (
                                        <button
                                            type="button"
                                            onClick={() => onUpdateStatus(invoice.id, 'Sent')}
                                            className="btn btn-sm btn-outline-primary"
                                        >
                                            Mark sent
                                        </button>
                                    ) : null}
                                    {invoice.status === 'Sent' ? (
                                        <button
                                            type="button"
                                            onClick={() => onUpdateStatus(invoice.id, 'Overdue')}
                                            className="btn btn-sm btn-outline-warning"
                                        >
                                            Mark overdue
                                        </button>
                                    ) : null}
                                    {invoice.status === 'Sent' || invoice.status === 'Overdue' ? (
                                        <button
                                            type="button"
                                            onClick={() => onUpdateStatus(invoice.id, 'Paid')}
                                            className="btn btn-sm btn-outline-success"
                                        >
                                            Mark paid
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                            {lineItems.length > 0 ? (
                                <div className="card mt-4 border-0 bg-secondary-lt">
                                    <div className="card-body">
                                        <ul className="list-unstyled mb-3">
                                            {lineItems.slice(0, 3).map((item) => (
                                                <li key={item.id} className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-semibold">{item.description}</span>
                                                    <span>
                                                        {item.quantity} × {formatCurrency(item.unitPrice, currency)} ={' '}
                                                        <strong>{formatCurrency(item.total, currency)}</strong>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        {lineItems.length > 3 ? (
                                            <div className="text-secondary text-uppercase small">
                                                +{lineItems.length - 3} more line items
                                            </div>
                                        ) : null}
                                        <div className="mt-3">
                                            <div className="d-flex justify-content-between text-secondary">
                                                <span>Subtotal</span>
                                                <span>{formatCurrency(totals.subtotal, currency)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between text-secondary">
                                                <span>Tax ({Math.round(taxRate * 100)}%)</span>
                                                <span>{formatCurrency(totals.taxTotal, currency)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between fw-semibold h5 mb-0 mt-2">
                                                <span>Total</span>
                                                <span>{formatCurrency(totals.total, currency)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default InvoiceTable;
