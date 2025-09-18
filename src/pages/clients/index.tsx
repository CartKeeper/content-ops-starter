import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dayjs from 'dayjs';
import type { GetStaticProps } from 'next';

import classNames from 'classnames';

import { CrmAuthGuard, DashboardCard, StatusPill, WorkspaceLayout } from '../../components/crm';
import { InvoiceBuilderModal, type InvoiceBuilderSubmitValues } from '../../components/crm/InvoiceBuilderModal';
import { useNetlifyIdentity } from '../../components/auth';
import { clients as baseClients, galleryCollection } from '../../data/crm';
import type { InvoiceCatalogItem, InvoicePackage, InvoiceRecord, InvoiceStatus } from '../../types/invoice';
import {
    buildInvoiceClientOptions,
    type InvoiceClientDirectoryEntry,
    type InvoiceClientOption
} from '../../utils/build-invoice-client-options';
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

type CrmCollectionResponse<T> = {
    data?: T[];
    error?: string;
};

type ClientDefaultsState = {
    defaultPackageIds: string[];
    defaultItemIds: string[];
};

type ClientListFilter = 'all' | 'withOutstanding' | 'noUpcoming';

const searchInputClassName =
    'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

const CLIENT_FILTER_OPTIONS: Array<{ id: ClientListFilter; label: string }> = [
    { id: 'all', label: 'All clients' },
    { id: 'withOutstanding', label: 'Outstanding' },
    { id: 'noUpcoming', label: 'No upcoming' }
];

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
    const [searchTerm, setSearchTerm] = React.useState<string>('');
    const [listFilter, setListFilter] = React.useState<ClientListFilter>('all');
    const [copyStatus, setCopyStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
    const [clientDirectory, setClientDirectory] = React.useState<InvoiceClientDirectoryEntry[]>([]);
    const [catalogItems, setCatalogItems] = React.useState<InvoiceCatalogItem[]>([]);
    const [catalogPackages, setCatalogPackages] = React.useState<InvoicePackage[]>([]);
    const [isCatalogLoading, setIsCatalogLoading] = React.useState<boolean>(false);
    const [isSavingClientDefaults, setIsSavingClientDefaults] = React.useState<boolean>(false);
    const [editedDefaults, setEditedDefaults] = React.useState<ClientDefaultsState>({
        defaultPackageIds: [],
        defaultItemIds: []
    });

    const isFiltered = listFilter !== 'all' || searchTerm.trim().length > 0;

    useAutoDismiss(feedback, () => setFeedback(null));

    const notify = React.useCallback((type: FeedbackNotice['type'], message: string) => {
        setFeedback({ id: `${Date.now()}`, type, message });
    }, []);

    React.useEffect(() => {
        let isActive = true;

        async function fetchCollection<T>(resource: string): Promise<T[]> {
            const response = await fetch(`/api/crm/${resource}`);
            let payload: CrmCollectionResponse<T> | null = null;

            try {
                payload = (await response.json()) as CrmCollectionResponse<T>;
            } catch (error) {
                // Ignore JSON parse errors, handled below
            }

            if (!response.ok) {
                const message = payload?.error || `Unable to load ${resource}.`;
                throw new Error(message);
            }

            return Array.isArray(payload?.data) ? (payload?.data as T[]) : [];
        }

        async function loadCatalog() {
            setIsCatalogLoading(true);

            try {
                const [clients, items, packages] = await Promise.all([
                    fetchCollection<InvoiceClientDirectoryEntry>('clients').catch((error) => {
                        console.error('Failed to load CRM clients', error);
                        return [] as InvoiceClientDirectoryEntry[];
                    }),
                    fetchCollection<InvoiceCatalogItem>('invoice-items').catch((error) => {
                        console.error('Failed to load invoice catalog items', error);
                        return [] as InvoiceCatalogItem[];
                    }),
                    fetchCollection<InvoicePackage>('invoice-packages').catch((error) => {
                        console.error('Failed to load invoice packages', error);
                        return [] as InvoicePackage[];
                    })
                ]);

                if (!isActive) {
                    return;
                }

                setClientDirectory(clients);
                setCatalogItems(items);
                setCatalogPackages(packages);
            } catch (error) {
                if (isActive) {
                    console.error('Failed to load CRM resources', error);
                }
            } finally {
                if (isActive) {
                    setIsCatalogLoading(false);
                }
            }
        }

        loadCatalog();

        return () => {
            isActive = false;
        };
    }, []);

    const clientOptions: InvoiceClientOption[] = React.useMemo(
        () => buildInvoiceClientOptions(invoiceList, clientDirectory),
        [invoiceList, clientDirectory]
    );
    const clientSummaries = React.useMemo(() => createClientSummaries(invoiceList), [invoiceList]);
    const filteredClientSummaries = React.useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return clientSummaries.filter((client) => {
            if (listFilter === 'withOutstanding' && client.outstandingTotal <= 0) {
                return false;
            }
            if (listFilter === 'noUpcoming' && client.upcomingShoot) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            const haystack = [client.name, client.email, client.phone, client.statusLabel]
                .filter((value): value is string => Boolean(value))
                .map((value) => value.toLowerCase());

            return haystack.some((value) => value.includes(normalizedSearch));
        });
    }, [clientSummaries, listFilter, searchTerm]);

    const clientMetrics = React.useMemo(() => {
        const total = clientSummaries.length;
        const outstandingClients = clientSummaries.filter((client) => client.outstandingTotal > 0);
        const outstandingTotal = outstandingClients.reduce((sum, client) => sum + client.outstandingTotal, 0);
        const upcomingShoots = clientSummaries.filter((client) => Boolean(client.upcomingShoot)).length;
        const portalReady = clientSummaries.filter((client) => Boolean(client.portalId)).length;
        const invoiceCount = clientSummaries.reduce((sum, client) => sum + client.invoiceCount, 0);
        const averageInvoices = total > 0 ? invoiceCount / total : 0;
        const latestInvoiceDue = clientSummaries.reduce<string | null>((latest, client) => {
            if (!client.lastInvoiceDue) {
                return latest;
            }
            if (!latest) {
                return client.lastInvoiceDue;
            }
            return dayjs(client.lastInvoiceDue).isAfter(dayjs(latest)) ? client.lastInvoiceDue : latest;
        }, null);

        return {
            total,
            outstandingCount: outstandingClients.length,
            outstandingTotal,
            upcomingShoots,
            portalReady,
            averageInvoices,
            latestInvoiceDue
        };
    }, [clientSummaries]);

    const [selectedClientId, setSelectedClientId] = React.useState<string>(() => filteredClientSummaries[0]?.id ?? '');

    React.useEffect(() => {
        if (filteredClientSummaries.length === 0) {
            setSelectedClientId('');
            return;
        }
        const hasSelected = filteredClientSummaries.some((client) => client.id === selectedClientId);
        if (!hasSelected) {
            setSelectedClientId(filteredClientSummaries[0].id);
        }
    }, [filteredClientSummaries, selectedClientId]);

    const handleResetClientFilters = React.useCallback(() => {
        setSearchTerm('');
        setListFilter('all');
    }, []);

    const handleToggleDefaultValue = React.useCallback((key: keyof ClientDefaultsState, value: string) => {
        setEditedDefaults((previous) => {
            const current = new Set(previous[key]);
            if (current.has(value)) {
                current.delete(value);
            } else {
                current.add(value);
            }
            return {
                ...previous,
                [key]: Array.from(current)
            } as ClientDefaultsState;
        });
    }, []);

    const selectedClient = clientSummaries.find((client) => client.id === selectedClientId) ?? null;

    const selectedClientDirectoryEntry = React.useMemo(() => {
        if (!selectedClient) {
            return null;
        }

        const normalizedName = selectedClient.name.trim().toLowerCase();
        return (
            clientDirectory.find((entry) => entry.name?.trim().toLowerCase() === normalizedName) ?? null
        );
    }, [clientDirectory, selectedClient]);

    React.useEffect(() => {
        if (selectedClientDirectoryEntry) {
            setEditedDefaults({
                defaultPackageIds: [...(selectedClientDirectoryEntry.defaultPackageIds ?? [])],
                defaultItemIds: [...(selectedClientDirectoryEntry.defaultItemIds ?? [])]
            });
        } else {
            setEditedDefaults({ defaultPackageIds: [], defaultItemIds: [] });
        }
    }, [selectedClientDirectoryEntry]);

    const handleSaveClientDefaults = React.useCallback(async () => {
        if (!selectedClientDirectoryEntry?.id) {
            notify('error', 'This client is not yet synced to the CRM directory.');
            return;
        }

        setIsSavingClientDefaults(true);

        try {
            const response = await fetch(`/api/crm/clients?id=${encodeURIComponent(selectedClientDirectoryEntry.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    defaultPackageIds: editedDefaults.defaultPackageIds,
                    defaultItemIds: editedDefaults.defaultItemIds
                })
            });

            let payload: CrmCollectionResponse<InvoiceClientDirectoryEntry> | null = null;
            try {
                payload = (await response.json()) as CrmCollectionResponse<InvoiceClientDirectoryEntry>;
            } catch (error) {
                // Ignore payload parsing errors
            }

            if (!response.ok) {
                const message = payload?.error || 'Unable to save invoice presets for this client.';
                throw new Error(message);
            }

            setClientDirectory((previous) => {
                const nextEntry: InvoiceClientDirectoryEntry = {
                    ...selectedClientDirectoryEntry,
                    defaultPackageIds: [...editedDefaults.defaultPackageIds],
                    defaultItemIds: [...editedDefaults.defaultItemIds]
                };

                const hasEntry = previous.some((entry) => entry.id === selectedClientDirectoryEntry.id);
                if (hasEntry) {
                    return previous.map((entry) => (entry.id === selectedClientDirectoryEntry.id ? nextEntry : entry));
                }

                return [...previous, nextEntry];
            });

            notify('success', `Invoice presets updated for ${selectedClientDirectoryEntry.name}.`);
        } catch (error) {
            console.error('Failed to save client defaults', error);
            notify('error', error instanceof Error ? error.message : 'Unable to save invoice presets.');
        } finally {
            setIsSavingClientDefaults(false);
        }
    }, [editedDefaults.defaultItemIds, editedDefaults.defaultPackageIds, notify, selectedClientDirectoryEntry]);

    React.useEffect(() => {
        if (copyStatus === 'idle') {
            return;
        }
        const timer = setTimeout(() => setCopyStatus('idle'), 2500);
        return () => clearTimeout(timer);
    }, [copyStatus]);

    const sortedPackages = React.useMemo(
        () => [...catalogPackages].sort((a, b) => a.name.localeCompare(b.name)),
        [catalogPackages]
    );

    const sortedItems = React.useMemo(
        () => [...catalogItems].sort((a, b) => a.name.localeCompare(b.name)),
        [catalogItems]
    );

    const hasDefaultsChanged = React.useMemo(() => {
        const sortKey = (values: string[] | undefined) => [...(values ?? [])].sort().join('|');
        const originalPackages = sortKey(selectedClientDirectoryEntry?.defaultPackageIds);
        const originalItems = sortKey(selectedClientDirectoryEntry?.defaultItemIds);
        return (
            sortKey(editedDefaults.defaultPackageIds) !== originalPackages ||
            sortKey(editedDefaults.defaultItemIds) !== originalItems
        );
    }, [editedDefaults.defaultItemIds, editedDefaults.defaultPackageIds, selectedClientDirectoryEntry]);

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
        return `/gallery-portal/${selectedClient.portalId}${tokenQuery}`;
    }, [selectedClient]);

    React.useEffect(() => {
        setCopyStatus('idle');
    }, [portalHref]);

    const handleCopyPortalLink = React.useCallback(async () => {
        if (!portalHref) {
            return;
        }

        const resolvedUrl =
            typeof window !== 'undefined' ? new URL(portalHref, window.location.origin).toString() : portalHref;

        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(resolvedUrl);
            } else if (typeof document !== 'undefined') {
                const textArea = document.createElement('textarea');
                textArea.value = resolvedUrl;
                textArea.setAttribute('readonly', '');
                textArea.style.position = 'absolute';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (!successful) {
                    throw new Error('Copy command was rejected');
                }
            } else {
                throw new Error('Clipboard access unavailable');
            }
            setCopyStatus('success');
        } catch (error) {
            console.error('Copy portal link failed', error);
            setCopyStatus('error');
        }
    }, [portalHref]);

    return (
        <>
            <Head>
                <title>Clients · Studio Relationships &amp; Billing</title>
            </Head>
            <WorkspaceLayout>
                <div className="px-4 pb-16 pt-8 sm:px-6 lg:px-10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-500 dark:text-indigo-300">
                                Client success
                            </p>
                            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Clients</h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                                Manage every client relationship, invoices, and portals from one dashboard.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openModal}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-slate-950"
                        >
                            Create invoice
                        </button>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <DashboardCard
                            title="Active clients"
                            value={`${clientMetrics.total}`}
                            trend={{
                                value:
                                    clientMetrics.outstandingCount > 0
                                        ? `${clientMetrics.outstandingCount} with balance`
                                        : 'All paid up',
                                label: 'Relationships',
                                isPositive: clientMetrics.outstandingCount === 0
                            }}
                        >
                            <p className="mb-0 text-sm">
                                {clientMetrics.total > 0
                                    ? 'Keep momentum by checking in weekly.'
                                    : 'Send your first invoice to add a client.'}
                            </p>
                        </DashboardCard>
                        <DashboardCard
                            title="Outstanding balance"
                            value={formatCurrency(clientMetrics.outstandingTotal)}
                            trend={{
                                value:
                                    clientMetrics.averageInvoices > 0
                                        ? `${clientMetrics.averageInvoices.toFixed(1)} invoices/client`
                                        : 'No invoices yet',
                                label: 'Billing velocity',
                                isPositive: clientMetrics.outstandingTotal === 0
                            }}
                        >
                            <p className="mb-0 text-sm">
                                {clientMetrics.outstandingTotal > 0
                                    ? 'Follow up on balances to keep cash flow healthy.'
                                    : 'Every invoice is paid in full.'}
                            </p>
                        </DashboardCard>
                        <DashboardCard
                            title="Upcoming shoots"
                            value={clientMetrics.upcomingShoots > 0 ? `${clientMetrics.upcomingShoots}` : '—'}
                            trend={{
                                value: clientMetrics.latestInvoiceDue
                                    ? `Next invoice due ${formatDate(clientMetrics.latestInvoiceDue)}`
                                    : 'No deadlines pending',
                                label: 'Schedule',
                                isPositive: clientMetrics.upcomingShoots > 0
                            }}
                        >
                            <p className="mb-0 text-sm">
                                {clientMetrics.upcomingShoots > 0
                                    ? 'Prep galleries and invoices before the shoot.'
                                    : 'Book your next session to fill the calendar.'}
                            </p>
                        </DashboardCard>
                        <DashboardCard
                            title="Portal ready"
                            value={
                                clientMetrics.total > 0
                                    ? `${clientMetrics.portalReady}/${clientMetrics.total} ready`
                                    : '0 ready'
                            }
                            trend={{
                                value: `${
                                    clientMetrics.total > 0
                                        ? Math.round((clientMetrics.portalReady / clientMetrics.total) * 100)
                                        : 0
                                }% galleries`,
                                label: 'Client experience',
                                isPositive:
                                    clientMetrics.total > 0
                                        ? clientMetrics.portalReady >= Math.ceil(clientMetrics.total * 0.5)
                                        : false
                            }}
                        >
                            <p className="mb-0 text-sm">
                                {clientMetrics.portalReady > 0
                                    ? 'Share portals as soon as assets are ready.'
                                    : 'Connect galleries to unlock the portal.'}
                            </p>
                        </DashboardCard>
                    </div>

                    <div className="mt-10 flex flex-col gap-8 lg:flex-row">
                        <aside className="lg:w-80">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500">
                                            Client list
                                        </p>
                                        <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                                            Relationship roster
                                        </h2>
                                    </div>
                                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
                                        {clientSummaries.length}
                                    </span>
                                </div>
                                <div className="mt-6 space-y-4">
                                    <div>
                                        <label htmlFor="client-search" className="sr-only">
                                            Search clients
                                        </label>
                                        <input
                                            id="client-search"
                                            type="search"
                                            value={searchTerm}
                                            onChange={(event) => setSearchTerm(event.target.value)}
                                            placeholder="Search by name or email"
                                            className={searchInputClassName}
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="inline-flex rounded-full bg-slate-100 p-1 dark:bg-slate-800/60">
                                            {CLIENT_FILTER_OPTIONS.map((option) => (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => setListFilter(option.id)}
                                                    className={classNames(
                                                        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                                                        listFilter === option.id
                                                            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                                    )}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                        {isFiltered ? (
                                            <button
                                                type="button"
                                                onClick={handleResetClientFilters}
                                                className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                                            >
                                                Reset
                                            </button>
                                        ) : null}
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                        {clientSummaries.length > 0
                                            ? `Showing ${filteredClientSummaries.length} of ${clientSummaries.length}`
                                            : 'No clients yet'}
                                    </p>
                                </div>
                                <div className="mt-6 space-y-3">
                                    {filteredClientSummaries.map((client) => {
                                        const isActive = client.id === selectedClientId;
                                        return (
                                            <button
                                                key={client.id}
                                                type="button"
                                                onClick={() => setSelectedClientId(client.id)}
                                                className={classNames(
                                                    'w-full rounded-2xl border px-4 py-3 text-left transition',
                                                    isActive
                                                        ? 'border-indigo-500 bg-indigo-50 shadow-sm dark:border-indigo-400 dark:bg-indigo-500/10'
                                                        : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40'
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{client.name}</p>
                                                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                                        {formatCurrency(client.outstandingTotal)}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <span>
                                                        {client.invoiceCount} invoice{client.invoiceCount === 1 ? '' : 's'}
                                                    </span>
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
                                    {filteredClientSummaries.length === 0 ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {clientSummaries.length === 0
                                                ? 'No clients yet. Create an invoice to add a new relationship.'
                                                : 'No clients match these filters. Try adjusting your search.'}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </aside>
                        <section className="flex-1">
                            {feedback ? (
                                <div
                                    className={classNames(
                                        'mb-6 rounded-2xl border px-4 py-3 text-sm shadow-sm',
                                        feedback.type === 'success'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                                            : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
                                    )}
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
                                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                                    {selectedClient.statusLabel}
                                                </p>
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
                                            <div className="flex flex-col items-stretch gap-3 sm:items-end">
                                                {portalHref ? (
                                                    <div className="flex flex-col items-stretch gap-2 sm:items-end">
                                                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                                            <Link
                                                                href={portalHref}
                                                                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-500 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
                                                            >
                                                                Open client portal
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                onClick={handleCopyPortalLink}
                                                                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                                            >
                                                                {copyStatus === 'success'
                                                                    ? 'Link copied'
                                                                    : copyStatus === 'error'
                                                                    ? 'Copy failed'
                                                                    : 'Copy link'}
                                                            </button>
                                                        </div>
                                                        {copyStatus === 'success' ? (
                                                            <p className="text-xs text-emerald-600 dark:text-emerald-300 sm:text-right">
                                                                Portal link copied to clipboard.
                                                            </p>
                                                        ) : null}
                                                        {copyStatus === 'error' ? (
                                                            <p className="text-xs text-rose-600 dark:text-rose-300 sm:text-right">
                                                                Unable to copy the portal link. Try again.
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
                                                        Add a gallery to generate a portal login.
                                                    </p>
                                                )}
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

                                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-500 dark:text-indigo-300">
                                                    Invoice presets
                                                </p>
                                                <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                                                    Saved catalog defaults
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                    Pin frequently used packages or services so they appear automatically in the invoice builder.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveClientDefaults}
                                                    disabled={
                                                        isSavingClientDefaults ||
                                                        !selectedClientDirectoryEntry?.id ||
                                                        !hasDefaultsChanged
                                                    }
                                                    className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-300"
                                                >
                                                    {isSavingClientDefaults ? 'Saving…' : 'Save presets'}
                                                </button>
                                            </div>
                                        </div>
                                        {selectedClientDirectoryEntry ? (
                                            <div className="mt-6 grid gap-6 md:grid-cols-2">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                                        Packages
                                                    </p>
                                                    {isCatalogLoading ? (
                                                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading catalog…</p>
                                                    ) : sortedPackages.length > 0 ? (
                                                        <ul className="mt-2 space-y-2">
                                                            {sortedPackages.map((pkg) => {
                                                                const checked = editedDefaults.defaultPackageIds.includes(pkg.id);
                                                                return (
                                                                    <li key={pkg.id}>
                                                                        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-indigo-400">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400 dark:border-slate-600 dark:text-indigo-400"
                                                                                checked={checked}
                                                                                onChange={() => handleToggleDefaultValue('defaultPackageIds', pkg.id)}
                                                                            />
                                                                            <span>
                                                                                <span className="font-semibold text-slate-900 dark:text-white">{pkg.name}</span>
                                                                                {pkg.description ? (
                                                                                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                                                                        {pkg.description}
                                                                                    </span>
                                                                                ) : null}
                                                                            </span>
                                                                        </label>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    ) : (
                                                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                            Create a package in the CRM catalog to add it here.
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                                        Line items
                                                    </p>
                                                    {isCatalogLoading ? (
                                                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading catalog…</p>
                                                    ) : sortedItems.length > 0 ? (
                                                        <ul className="mt-2 space-y-2">
                                                            {sortedItems.map((item) => {
                                                                const checked = editedDefaults.defaultItemIds.includes(item.id);
                                                                return (
                                                                    <li key={item.id}>
                                                                        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-indigo-400">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400 dark:border-slate-600 dark:text-indigo-400"
                                                                                checked={checked}
                                                                                onChange={() => handleToggleDefaultValue('defaultItemIds', item.id)}
                                                                            />
                                                                            <span>
                                                                                <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
                                                                                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                                                                    {item.description}
                                                                                </span>
                                                                            </span>
                                                                        </label>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    ) : (
                                                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                            Save catalog line items to reuse them here.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                                                Add this client to the CRM clients collection to manage default packages and items.
                                            </div>
                                        )}
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
                            ) : clientSummaries.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                    No clients yet. Create an invoice to start a new relationship.
                                </div>
                            ) : (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                    Select a client to review their invoices and contact information.
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </WorkspaceLayout>

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
