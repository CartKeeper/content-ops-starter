import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dayjs from 'dayjs';
import type { GetStaticProps } from 'next';

import { CrmAuthGuard, StatusPill } from '../../components/crm';
import { InvoiceBuilderModal, type InvoiceBuilderSubmitValues } from '../../components/crm/InvoiceBuilderModal';
import { useNetlifyIdentity } from '../../components/auth';
import { clients as baseClients, galleryCollection } from '../../data/crm';
import type { InvoiceRecord, InvoiceStatus } from '../../types/invoice';
import { buildInvoiceClientOptions } from '../../utils/build-invoice-client-options';
import { readCmsCollection } from '../../utils/read-cms-collection';
import { useAutoDismiss } from '../../utils/use-auto-dismiss';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
});

const statusToneMap: Record<InvoiceStatus, React.ComponentProps<typeof StatusPill>['tone']> = {
    Draft: 'neutral',
    Sent: 'info',
    Paid: 'success',
    Overdue: 'danger'
};

type FeedbackNotice = {
    id: string;
    type: 'success' | 'error';
    message: string;
};

type ClientSummary = {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    statusLabel: string;
    shoots?: number;
    lastShoot?: string;
    upcomingShoot?: string;
    invoiceCount: number;
    outstandingTotal: number;
    lastInvoiceDue?: string;
    lastInvoiceStatus?: InvoiceStatus;
    portalId?: string;
    portalToken?: string | null;
};

type ClientsPageProps = {
    invoices: InvoiceRecord[];
};

function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

function formatDate(value?: string): string {
    if (!value) {
        return '—';
    }
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('MMM D, YYYY') : value;
}

function createClientSummaries(invoices: InvoiceRecord[]): ClientSummary[] {
    const galleryByClient = new Map(
        galleryCollection.map((gallery) => [gallery.client, { id: gallery.id, token: gallery.portalSettings?.token ?? null }])
    );

    const summaries = new Map<string, ClientSummary>();

    baseClients.forEach((client) => {
        const gallery = galleryByClient.get(client.name);
        summaries.set(client.name, {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            statusLabel: client.status,
            shoots: client.shoots,
            lastShoot: client.lastShoot,
            upcomingShoot: client.upcomingShoot,
            invoiceCount: 0,
            outstandingTotal: 0,
            portalId: gallery?.id,
            portalToken: gallery?.token ?? null
        });
    });

    invoices.forEach((invoice) => {
        const clientName = invoice.client?.trim();
        if (!clientName) {
            return;
        }

        let summary = summaries.get(clientName);
        if (!summary) {
            const gallery = galleryByClient.get(clientName);
            const slug = clientName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            summary = {
                id: `invoice-${slug}`,
                name: clientName,
                email: invoice.clientEmail,
                phone: undefined,
                statusLabel: 'Lead',
                invoiceCount: 0,
                outstandingTotal: 0,
                portalId: gallery?.id,
                portalToken: gallery?.token ?? null
            };
            summaries.set(clientName, summary);
        }

        summary.invoiceCount += 1;
        const total = invoice.amount ?? invoice.totals?.total ?? 0;
        if (invoice.status !== 'Paid') {
            summary.outstandingTotal += total;
        }

        if (!summary.lastInvoiceDue || dayjs(invoice.dueDate).isAfter(dayjs(summary.lastInvoiceDue))) {
            summary.lastInvoiceDue = invoice.dueDate;
            summary.lastInvoiceStatus = invoice.status;
        }

        if (!summary.email && invoice.clientEmail) {
            summary.email = invoice.clientEmail;
        }
    });

    return Array.from(summaries.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function ClientsWorkspace({ invoices }: ClientsPageProps) {
    const identity = useNetlifyIdentity();
    const [invoiceList, setInvoiceList] = React.useState<InvoiceRecord[]>(() =>
        Array.isArray(invoices) ? invoices : []
    );
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
    const clientSummaries = React.useMemo(() => createClientSummaries(invoiceList), [invoiceList]);

    const [selectedClientId, setSelectedClientId] = React.useState<string>(() => clientSummaries[0]?.id ?? '');

    React.useEffect(() => {
        if (clientSummaries.length === 0) {
            setSelectedClientId('');
            return;
        }
        const hasSelected = clientSummaries.some((client) => client.id === selectedClientId);
        if (!hasSelected) {
            setSelectedClientId(clientSummaries[0].id);
        }
    }, [clientSummaries, selectedClientId]);

    const selectedClient = clientSummaries.find((client) => client.id === selectedClientId) ?? null;

    const clientInvoices = React.useMemo(
        () =>
            invoiceList.filter((invoice) =>
                selectedClient ? invoice.client?.trim() === selectedClient.name : false
            ),
        [invoiceList, selectedClient]
    );

    const outstandingSelected = React.useMemo(
        () =>
            clientInvoices
                .filter((invoice) => invoice.status !== 'Paid')
                .reduce((total, invoice) => total + (invoice.amount ?? invoice.totals?.total ?? 0), 0),
        [clientInvoices]
    );

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
            notify('success', `Invoice ${created.id ?? ''} created for ${created.client}.`);
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
                const token = await identity.getToken();
                if (!token) {
                    throw new Error('Authentication expired. Sign in again to generate invoices.');
                }

                const response = await fetch('/.netlify/functions/generate-invoice-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
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

            setCheckoutInvoiceId(invoice.id);

            try {
                const token = await identity.getToken();
                if (!token) {
                    throw new Error('Authentication expired. Sign in again to create payment links.');
                }

                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://codex.studio';
                const response = await fetch('/.netlify/functions/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        invoice,
                        successUrl: `${origin}/clients?checkout=success`,
                        cancelUrl: `${origin}/clients?checkout=cancel`
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
        [identity, notify]
    );

    const selectedClientOption = React.useMemo(() => {
        if (!selectedClient) {
            return undefined;
        }
        return clientOptions.find((option) => option.name === selectedClient.name);
    }, [clientOptions, selectedClient]);

    const openModal = React.useCallback(() => {
        if (selectedClientOption) {
            setModalClientId(selectedClientOption.id);
        } else {
            setModalClientId(undefined);
        }
        setIsModalOpen(true);
    }, [selectedClientOption]);

    const closeModal = React.useCallback(() => {
        setIsModalOpen(false);
        setModalClientId(undefined);
    }, []);

    const initialProjectName = React.useMemo(() => {
        if (!selectedClient) {
            return undefined;
        }
        if (selectedClient.upcomingShoot) {
            return `${selectedClient.upcomingShoot} invoice`;
        }
        return `${selectedClient.name} photography invoice`;
    }, [selectedClient]);

    const portalHref = React.useMemo(() => {
        if (!selectedClient?.portalId) {
            return null;
        }
        const tokenQuery = selectedClient.portalToken ? `?token=${encodeURIComponent(selectedClient.portalToken)}` : '';
        return `/portal/${selectedClient.portalId}${tokenQuery}`;
    }, [selectedClient]);

    return (
        <>
            <Head>
                <title>Clients · Studio Relationships &amp; Billing</title>
            </Head>
            <main className="min-h-screen bg-slate-100 pb-16 transition-colors dark:bg-slate-950">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pt-10 lg:flex-row">
                    <aside className="lg:w-80">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-500 dark:text-indigo-300">
                                        Clients
                                    </p>
                                    <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                                        Relationship roster
                                    </h1>
                                </div>
                                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
                                    {clientSummaries.length}
                                </span>
                            </div>
                            <div className="mt-6 space-y-3">
                                {clientSummaries.map((client) => {
                                    const isActive = client.id === selectedClientId;
                                    return (
                                        <button
                                            key={client.id}
                                            type="button"
                                            onClick={() => setSelectedClientId(client.id)}
                                            className={[
                                                'w-full rounded-2xl border px-4 py-3 text-left transition',
                                                isActive
                                                    ? 'border-indigo-500 bg-indigo-50 shadow-sm dark:border-indigo-400 dark:bg-indigo-500/10'
                                                    : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40'
                                            ].join(' ')}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    {client.name}
                                                </p>
                                                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                                    {formatCurrency(client.outstandingTotal)}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <span>{client.invoiceCount} invoice{client.invoiceCount === 1 ? '' : 's'}</span>
                                                <span>• {client.statusLabel}</span>
                                                {client.lastInvoiceStatus ? (
                                                    <StatusPill tone={statusToneMap[client.lastInvoiceStatus]}>
                                                        {client.lastInvoiceStatus}
                                                    </StatusPill>
                                                ) : null}
                                            </div>
                                        </button>
                                    );
                                })}
                                {clientSummaries.length === 0 ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        No clients yet. Create an invoice to add a new relationship.
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </aside>
                    <section className="flex-1">
                        {feedback ? (
                            <div
                                className={[
                                    'mb-6 rounded-2xl border px-4 py-3 text-sm shadow-sm',
                                    feedback.type === 'success'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                                        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
                                ].join(' ')}
                            >
                                {feedback.message}
                            </div>
                        ) : null}
                        {selectedClient ? (
                            <div className="space-y-8">
                                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-500 dark:text-indigo-300">
                                                Client profile
                                            </p>
                                            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                                                {selectedClient.name}
                                            </h2>
                                            <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                                                {selectedClient.email ? (
                                                    <p>
                                                        <a
                                                            href={`mailto:${selectedClient.email}`}
                                                            className="hover:text-indigo-600 dark:hover:text-indigo-300"
                                                        >
                                                            {selectedClient.email}
                                                        </a>
                                                    </p>
                                                ) : null}
                                                {selectedClient.phone ? (
                                                    <p>
                                                        <a
                                                            href={`tel:${selectedClient.phone}`}
                                                            className="hover:text-indigo-600 dark:hover:text-indigo-300"
                                                        >
                                                            {selectedClient.phone}
                                                        </a>
                                                    </p>
                                                ) : null}
                                                {selectedClient.upcomingShoot ? (
                                                    <p>Upcoming: {formatDate(selectedClient.upcomingShoot)}</p>
                                                ) : null}
                                                {selectedClient.lastShoot ? (
                                                    <p>Last shoot: {formatDate(selectedClient.lastShoot)}</p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                                            {portalHref ? (
                                                <Link
                                                    href={portalHref}
                                                    className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-500 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
                                                >
                                                    Open client portal
                                                </Link>
                                            ) : null}
                                            <button
                                                type="button"
                                                onClick={openModal}
                                                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4DE5FF]"
                                            >
                                                Create invoice
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                                Outstanding balance
                                            </p>
                                            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(outstandingSelected)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                                Total invoices
                                            </p>
                                            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                                                {clientInvoices.length}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                                Last invoice
                                            </p>
                                            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                                                {selectedClient.lastInvoiceDue ? formatDate(selectedClient.lastInvoiceDue) : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Invoices</h3>
                                    {clientInvoices.length > 0 ? (
                                        <ul className="space-y-4">
                                            {clientInvoices.map((invoice) => {
                                                const showMarkSent = invoice.status === 'Draft' || invoice.status === 'Overdue';
                                                const showMarkOverdue = invoice.status === 'Sent';
                                                const showMarkPaid = invoice.status === 'Sent' || invoice.status === 'Overdue';
                                                const invoiceTotal = formatCurrency(invoice.amount ?? invoice.totals?.total ?? 0);
                                                return (
                                                    <li
                                                        key={invoice.id}
                                                        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                                                    >
                                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                                                    Invoice {invoice.id}
                                                                </p>
                                                                <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                                                                    {invoice.project}
                                                                </h4>
                                                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                                    Due {formatDate(invoice.dueDate)}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                                                                    {invoiceTotal}
                                                                </p>
                                                                <StatusPill tone={statusToneMap[invoice.status]}>{invoice.status}</StatusPill>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleGenerateInvoicePdf(invoice)}
                                                                disabled={pdfInvoiceId === invoice.id}
                                                                className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                                            >
                                                                {pdfInvoiceId === invoice.id ? 'Generating…' : 'Download PDF'}
                                                            </button>
                                                            {invoice.paymentLink ? (
                                                                <a
                                                                    href={invoice.paymentLink}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                                                                >
                                                                    Pay online
                                                                </a>
                                                            ) : null}
                                                            {invoice.status !== 'Paid' ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCreateCheckoutSession(invoice)}
                                                                    disabled={checkoutInvoiceId === invoice.id}
                                                                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                                                                >
                                                                    {checkoutInvoiceId === invoice.id ? 'Creating link…' : 'Send payment link'}
                                                                </button>
                                                            ) : null}
                                                            {showMarkSent ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUpdateInvoiceStatus(invoice.id, 'Sent')}
                                                                    className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                                                >
                                                                    Mark sent
                                                                </button>
                                                            ) : null}
                                                            {showMarkOverdue ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUpdateInvoiceStatus(invoice.id, 'Overdue')}
                                                                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-600 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                                                                >
                                                                    Mark overdue
                                                                </button>
                                                            ) : null}
                                                            {showMarkPaid ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUpdateInvoiceStatus(invoice.id, 'Paid')}
                                                                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                                                                >
                                                                    Mark paid
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                            No invoices yet. Create one to kick off billing for this client.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Select a client to review their invoices and contact information.
                            </p>
                        )}
                    </section>
                </div>
            </main>

            {isModalOpen ? (
                <InvoiceBuilderModal
                    clients={clientOptions}
                    onClose={closeModal}
                    onSubmit={handleCreateInvoice}
                    initialClientId={modalClientId ?? selectedClientOption?.id}
                    initialProjectName={initialProjectName}
                />
            ) : null}
        </>
    );
}

export default function ClientsPage(props: ClientsPageProps) {
    return (
        <CrmAuthGuard
            title="Client workspace"
            description="Authenticate with the studio access code to view client relationships, invoices, and portal links."
        >
            <ClientsWorkspace {...props} />
        </CrmAuthGuard>
    );
}

export const getStaticProps: GetStaticProps<ClientsPageProps> = async () => {
    const invoices = await readCmsCollection<InvoiceRecord>('crm-invoices.json');

    return {
        props: {
            invoices
        }
    };
};
