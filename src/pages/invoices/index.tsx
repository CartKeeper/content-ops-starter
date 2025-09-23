import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dayjs from 'dayjs';
import type { GetStaticProps } from 'next';

import {
    CrmAuthGuard,
    InvoiceTable,
    SectionCard,
    WorkspaceLayout
} from '../../components/crm';
import { InvoiceBuilderModal, type InvoiceBuilderSubmitValues } from '../../components/crm/InvoiceBuilderModal';
import { useNetlifyIdentity } from '../../components/auth';
import type { InvoiceRecord, InvoiceStatus } from '../../types/invoice';
import { buildInvoiceClientOptions } from '../../utils/build-invoice-client-options';
import { readCmsCollection } from '../../utils/read-cms-collection';
import { useAutoDismiss } from '../../utils/use-auto-dismiss';
import { BILLING_ENABLED } from '../../utils/feature-flags';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
});

const statusFilters: Array<'all' | InvoiceStatus> = ['all', 'Draft', 'Sent', 'Paid', 'Overdue'];

type FeedbackNotice = {
    id: string;
    type: 'success' | 'error';
    message: string;
};

type InvoicesPageProps = {
    invoices: InvoiceRecord[];
};

function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

function InvoicesWorkspace({ invoices }: InvoicesPageProps) {
    const identity = useNetlifyIdentity();
    const billingEnabled = BILLING_ENABLED;
    const [invoiceList, setInvoiceList] = React.useState<InvoiceRecord[]>(() =>
        Array.isArray(invoices) ? invoices : []
    );
    const [statusFilter, setStatusFilter] = React.useState<'all' | InvoiceStatus>('all');
    const [clientFilter, setClientFilter] = React.useState<string>('all');
    const [feedback, setFeedback] = React.useState<FeedbackNotice | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [modalClientId, setModalClientId] = React.useState<string | undefined>(undefined);
    const [pdfInvoiceId, setPdfInvoiceId] = React.useState<string | null>(null);
    const [checkoutInvoiceId, setCheckoutInvoiceId] = React.useState<string | null>(null);

    useAutoDismiss(feedback, () => setFeedback(null));

    const notify = React.useCallback((type: FeedbackNotice['type'], message: string) => {
        setFeedback({ id: `${Date.now()}`, type, message });
    }, []);

    const clientOptions = React.useMemo(() => buildInvoiceClientOptions(invoiceList), [invoiceList]);

    const clientFilterOptions = React.useMemo(() => {
        const names = new Set<string>();
        invoiceList.forEach((invoice) => {
            if (invoice.client) {
                names.add(invoice.client.trim());
            }
        });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [invoiceList]);

    const filteredInvoices = React.useMemo(() => {
        return invoiceList.filter((invoice) => {
            const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
            const matchesClient =
                clientFilter === 'all' ? true : invoice.client?.trim() === clientFilter.trim();
            return matchesStatus && matchesClient;
        });
    }, [invoiceList, statusFilter, clientFilter]);

    const outstandingTotal = React.useMemo(
        () =>
            invoiceList
                .filter((invoice) => invoice.status !== 'Paid')
                .reduce((total, invoice) => total + (invoice.amount ?? invoice.totals?.total ?? 0), 0),
        [invoiceList]
    );

    const overdueCount = React.useMemo(
        () => invoiceList.filter((invoice) => invoice.status === 'Overdue').length,
        [invoiceList]
    );

    const paidLastThirtyDays = React.useMemo(() => {
        const threshold = dayjs().subtract(30, 'day');
        return invoiceList
            .filter((invoice) => invoice.status === 'Paid' && dayjs(invoice.dueDate).isAfter(threshold))
            .reduce((total, invoice) => total + (invoice.amount ?? invoice.totals?.total ?? 0), 0);
    }, [invoiceList]);

    const createRecord = React.useCallback(
        async <T,>(resource: 'invoices', payload: Record<string, unknown>) => {
            const response = await fetch(`/api/crm/${resource}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let result: { data?: T; error?: string } | null = null;
            try {
                result = await response.json();
            } catch (error) {
                // handled below
            }

            if (!response.ok) {
                const message = result?.error ?? 'Unable to save record. Please try again.';
                throw new Error(message);
            }

            return (result?.data as T) ?? (payload as T);
        },
        []
    );

    const handleCreateInvoice = React.useCallback(
        async (values: InvoiceBuilderSubmitValues) => {
            const lineItems = values.lineItems.map((item, index) => ({
                id: item.id || `item-${index + 1}`,
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                total: Number(item.quantity) * Number(item.unitPrice)
            }));

            const recordPayload: Record<string, unknown> = {
                client: values.client,
                clientEmail: values.clientEmail,
                clientAddress: values.clientAddress,
                project: values.project,
                issueDate: values.issueDate,
                dueDate: values.dueDate,
                notes: values.notes,
                taxRate: values.taxRate,
                template: values.template,
                status: 'Sent',
                lineItems,
                sendEmail: values.sendEmail,
                generatePaymentLink: values.generatePaymentLink,
                customFields: values.customFields
            };

            const created = await createRecord<InvoiceRecord>('invoices', recordPayload);
            setInvoiceList((previous) => [...previous, created]);
            notify('success', `Invoice ${created.id ?? ''} created.`);
        },
        [createRecord, notify]
    );

    const handleUpdateInvoiceStatus = React.useCallback(
        async (id: string, status: InvoiceStatus) => {
            const original = invoiceList.find((invoice) => invoice.id === id);
            if (!original) {
                return;
            }

            setInvoiceList((previous) => previous.map((invoice) => (invoice.id === id ? { ...invoice, status } : invoice)));

            try {
                const response = await fetch(`/api/crm/invoices?id=${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });

                if (!response.ok) {
                    throw new Error('Unable to update invoice status.');
                }

                const payload = (await response.json()) as { data?: InvoiceRecord } | undefined;
                if (payload?.data) {
                    setInvoiceList((previous) =>
                        previous.map((invoice) => (invoice.id === id ? { ...invoice, ...payload.data } : invoice))
                    );
                }
                notify('success', `Invoice ${id} marked ${status}.`);
            } catch (error) {
                console.error('Invoice status update failed', error);
                setInvoiceList((previous) => previous.map((invoice) => (invoice.id === id ? original : invoice)));
                notify('error', 'Unable to update invoice status.');
            }
        },
        [invoiceList, notify]
    );

    const handleGenerateInvoicePdf = React.useCallback(
        async (invoice: InvoiceRecord) => {
            if (!invoice) {
                return;
            }

            setPdfInvoiceId(invoice.id);

            try {
                if (!identity.isAuthenticated) {
                    throw new Error('Authentication expired. Sign in again to generate invoices.');
                }

                const response = await fetch('/.netlify/functions/generate-invoice-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        invoice,
                        studio: {
                            name: 'Codex Studio',
                            email: 'billing@codex.studio',
                            phone: '+1 (555) 123-4567',
                            website: 'https://codex.studio'
                        }
                    })
                });

                if (!response.ok) {
                    const payload = await response.json().catch(() => null);
                    throw new Error(payload?.error ?? 'Failed to generate the invoice PDF.');
                }

                if (typeof window !== 'undefined') {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = window.document.createElement('a');
                    link.href = url;
                    link.download = `invoice-${invoice.id}.pdf`;
                    window.document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                }

                notify('success', `Invoice ${invoice.id} PDF generated.`);
            } catch (error) {
                console.error('Invoice PDF generation failed', error);
                notify('error', error instanceof Error ? error.message : 'Unable to generate the PDF invoice.');
            } finally {
                setPdfInvoiceId(null);
            }
        },
        [identity, notify]
    );

    const handleCreateCheckoutSession = React.useCallback(
        async (invoice: InvoiceRecord) => {
            if (!invoice) {
                return;
            }

            if (!billingEnabled) {
                notify('error', 'Online payment links are disabled in this environment.');
                return;
            }

            setCheckoutInvoiceId(invoice.id);

            try {
                if (!identity.isAuthenticated) {
                    throw new Error('Authentication expired. Sign in again to create payment links.');
                }

                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://codex.studio';
                const response = await fetch('/.netlify/functions/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        invoice,
                        successUrl: `${origin}/invoices?checkout=success`,
                        cancelUrl: `${origin}/invoices?checkout=cancel`
                    })
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.error ?? 'Unable to start a Stripe checkout session.');
                }

                const checkoutUrl = payload?.url;
                if (!checkoutUrl) {
                    throw new Error('Stripe did not return a checkout URL.');
                }

                if (typeof window !== 'undefined') {
                    window.open(checkoutUrl, '_blank', 'noopener');
                }

                setInvoiceList((previous) =>
                    previous.map((record) => (record.id === invoice.id ? { ...record, paymentLink: checkoutUrl } : record))
                );

                notify('success', `Payment link created for invoice ${invoice.id}.`);
            } catch (error) {
                console.error('Stripe checkout session failed', error);
                notify('error', error instanceof Error ? error.message : 'Unable to start a Stripe checkout session.');
            } finally {
                setCheckoutInvoiceId(null);
            }
        },
        [billingEnabled, identity, notify]
    );

    const openModal = React.useCallback(() => {
        if (clientFilter !== 'all') {
            const target = clientOptions.find((option) => option.name === clientFilter);
            setModalClientId(target?.id);
        } else {
            setModalClientId(undefined);
        }
        setIsModalOpen(true);
    }, [clientFilter, clientOptions]);

    const closeModal = React.useCallback(() => {
        setIsModalOpen(false);
        setModalClientId(undefined);
    }, []);

    const initialProjectName = React.useMemo(() => {
        if (clientFilter !== 'all') {
            return `${clientFilter} photography invoice`;
        }
        return undefined;
    }, [clientFilter]);

    return (
        <>
            <Head>
                <title>Invoices · Studio Billing Workspace</title>
            </Head>
            <WorkspaceLayout>
                <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
                    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-500 dark:text-indigo-300">
                                Billing workspace
                            </p>
                            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                Studio invoices &amp; payments
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                                Monitor outstanding balances, trigger new payment links, and keep every client invoice in sync
                                with the studio ledger.
                            </p>
                            {!billingEnabled ? (
                                <div className="alert alert-warning mt-4 mb-0" role="status">
                                    Online payment links are disabled for this environment. Set{' '}
                                    <code>NEXT_PUBLIC_BILLING_ENABLED=true</code> and configure Stripe keys to enable checkout.
                                </div>
                            ) : null}
                        </div>
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-500 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
                            >
                                Back to dashboard
                            </Link>
                            <button
                                type="button"
                                onClick={openModal}
                                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4DE5FF]"
                            >
                                New invoice
                            </button>
                        </div>
                    </header>

                    {feedback ? (
                        <div
                            className={[
                                'mt-8 rounded-2xl border px-4 py-3 text-sm shadow-sm',
                                feedback.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                                    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
                            ].join(' ')}
                        >
                            {feedback.message}
                        </div>
                    ) : null}

                    <section className="mt-10 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                Outstanding balance
                            </p>
                            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(outstandingTotal)}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                Overdue invoices
                            </p>
                            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{overdueCount}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                Paid last 30 days
                            </p>
                            <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(paidLastThirtyDays)}
                            </p>
                        </div>
                    </section>

                    <SectionCard
                        title="Invoice registry"
                        description="Filter by client or status to revisit PDFs, payment links, and delivery logs."
                        className="mt-10"
                        action={
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value as 'all' | InvoiceStatus)}
                                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                >
                                    {statusFilters.map((status) => (
                                        <option key={status} value={status}>
                                            {status === 'all' ? 'All statuses' : status}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={clientFilter}
                                    onChange={(event) => setClientFilter(event.target.value)}
                                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                >
                                    <option value="all">All clients</option>
                                    {clientFilterOptions.map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        }
                    >
                        <InvoiceTable
                            invoices={filteredInvoices}
                            onUpdateStatus={handleUpdateInvoiceStatus}
                            onGeneratePdf={handleGenerateInvoicePdf}
                            onCreateCheckout={billingEnabled ? handleCreateCheckoutSession : undefined}
                            generatingInvoiceId={pdfInvoiceId}
                            checkoutInvoiceId={checkoutInvoiceId}
                            allowCheckout={billingEnabled}
                        />
                    </SectionCard>
                </div>
            </WorkspaceLayout>

            {isModalOpen ? (
                <InvoiceBuilderModal
                    clients={clientOptions}
                    onClose={closeModal}
                    onSubmit={handleCreateInvoice}
                    initialClientId={modalClientId}
                    initialProjectName={initialProjectName}
                />
            ) : null}
        </>
    );
}

export default function InvoicesPage(props: InvoicesPageProps) {
    return (
        <CrmAuthGuard>
            <InvoicesWorkspace {...props} />
        </CrmAuthGuard>
    );
}

export const getStaticProps: GetStaticProps<InvoicesPageProps> = async () => {
    const invoices = await readCmsCollection<InvoiceRecord>('crm-invoices.json');

    return {
        props: {
            invoices
        }
    };
};
