import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import useSWR from 'swr';

import type { InvoiceCatalogItem, InvoicePackage, InvoiceTemplateId } from '../../types/invoice';
import type { QuickActionFormField } from './QuickActionModal';
import { useQuickActionSettings } from './quick-action-settings';

export type InvoiceLineItemInput = {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
};

export type InvoiceBuilderSubmitValues = {
    client: string;
    clientEmail?: string;
    clientAddress?: string;
    project: string;
    issueDate: string;
    dueDate: string;
    notes?: string;
    taxRate: number;
    template: InvoiceTemplateId;
    lineItems: InvoiceLineItemInput[];
    sendEmail: boolean;
    generatePaymentLink: boolean;
    customFields: Record<string, string | boolean>;
};

type ClientOption = {
    id: string;
    name: string;
    email?: string;
    address?: string;
    defaultPackageIds?: string[];
    defaultItemIds?: string[];
};

type CrmCollectionResponse<T> = {
    data?: T[];
    error?: string;
};

async function fetchCrmCollection<T>(resource: string): Promise<T[]> {
    const response = await fetch(resource);
    let payload: CrmCollectionResponse<T> | null = null;

    try {
        payload = (await response.json()) as CrmCollectionResponse<T>;
    } catch (error) {
        // handled below
    }

    if (!response.ok) {
        const message = payload?.error || 'Unable to load CRM data.';
        throw new Error(message);
    }

    if (Array.isArray(payload?.data)) {
        return payload?.data as T[];
    }

    return [];
}

type InvoiceBuilderModalProps = {
    clients: ClientOption[];
    onClose: () => void;
    onSubmit: (values: InvoiceBuilderSubmitValues) => Promise<void>;
    initialClientId?: string;
    initialProjectName?: string;
};

const inputBaseStyles =
    'w-full rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm text-slate-800 shadow-sm backdrop-blur focus:border-[#5D3BFF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-[#7ADFFF] dark:focus:ring-[#4DE5FF]';

const templateOptions: { id: InvoiceTemplateId; label: string; description: string }[] = [
    { id: 'classic', label: 'Classic', description: 'Structured layout with highlighted totals.' },
    { id: 'minimal', label: 'Minimal', description: 'Clean, text-forward invoice ideal for quick reviews.' },
    { id: 'branded', label: 'Branded', description: 'Hero banner and accent colours for premium delivery.' }
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
});

function createLineItem(overrides: Partial<InvoiceLineItemInput> = {}): InvoiceLineItemInput {
    return {
        id: overrides.id ?? `item-${Math.random().toString(36).slice(2, 10)}`,
        description: overrides.description ?? '',
        quantity: overrides.quantity ?? 1,
        unitPrice: overrides.unitPrice ?? 0
    };
}

export function InvoiceBuilderModal({
    clients,
    onClose,
    onSubmit,
    initialClientId,
    initialProjectName
}: InvoiceBuilderModalProps) {
    const today = dayjs().format('YYYY-MM-DD');
    const defaultDue = dayjs().add(30, 'day').format('YYYY-MM-DD');
    const { getActiveFieldsForModal } = useQuickActionSettings();
    const dynamicFields = getActiveFieldsForModal('invoice');

    const resolvedInitialClientId = React.useMemo(() => {
        if (initialClientId && clients.some((client) => client.id === initialClientId)) {
            return initialClientId;
        }
        return clients[0]?.id ?? '';
    }, [clients, initialClientId]);

    const [selectedClientId, setSelectedClientId] = React.useState<string>(resolvedInitialClientId);
    const selectedClient = React.useMemo(
        () => clients.find((client) => client.id === selectedClientId),
        [clients, selectedClientId]
    );
    const [clientEmail, setClientEmail] = React.useState<string>(selectedClient?.email ?? '');
    const [clientAddress, setClientAddress] = React.useState<string>(selectedClient?.address ?? '');
    const [project, setProject] = React.useState(initialProjectName ?? 'New project invoice');
    const [issueDate, setIssueDate] = React.useState(today);
    const [dueDate, setDueDate] = React.useState(defaultDue);
    const [taxRatePercent, setTaxRatePercent] = React.useState<number>(7.5);
    const [notes, setNotes] = React.useState('');
    const [template, setTemplate] = React.useState<InvoiceTemplateId>('classic');
    const [lineItems, setLineItems] = React.useState<InvoiceLineItemInput[]>([createLineItem()]);
    const [sendEmail, setSendEmail] = React.useState(true);
    const [generatePaymentLink, setGeneratePaymentLink] = React.useState(true);
    const [customFieldValues, setCustomFieldValues] = React.useState<Record<string, string | boolean>>({});
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [selectedCatalogItemId, setSelectedCatalogItemId] = React.useState<string>('');
    const [selectedPackageId, setSelectedPackageId] = React.useState<string>('');
    const [pendingPackageSuggestions, setPendingPackageSuggestions] = React.useState<string[]>([]);
    const [pendingItemSuggestions, setPendingItemSuggestions] = React.useState<string[]>([]);

    const {
        data: catalogItems,
        error: catalogItemsError,
        isLoading: isCatalogItemsLoading
    } = useSWR<InvoiceCatalogItem[]>(
        '/api/crm/invoice-items',
        (resource) => fetchCrmCollection<InvoiceCatalogItem>(resource),
        { revalidateOnFocus: false }
    );

    const {
        data: catalogPackages,
        error: catalogPackagesError,
        isLoading: isCatalogPackagesLoading
    } = useSWR<InvoicePackage[]>(
        '/api/crm/invoice-packages',
        (resource) => fetchCrmCollection<InvoicePackage>(resource),
        { revalidateOnFocus: false }
    );

    const catalogItemMap = React.useMemo(() => {
        const map = new Map<string, InvoiceCatalogItem>();
        (catalogItems ?? []).forEach((item) => {
            if (item?.id) {
                map.set(item.id, item);
            }
        });
        return map;
    }, [catalogItems]);

    const catalogPackageMap = React.useMemo(() => {
        const map = new Map<string, InvoicePackage>();
        (catalogPackages ?? []).forEach((pkg) => {
            if (pkg?.id) {
                map.set(pkg.id, pkg);
            }
        });
        return map;
    }, [catalogPackages]);

    React.useEffect(() => {
        setSelectedClientId(resolvedInitialClientId);
    }, [resolvedInitialClientId]);

    React.useEffect(() => {
        if (selectedClient) {
            setClientEmail(selectedClient.email ?? '');
            setClientAddress(selectedClient.address ?? '');
        }
    }, [selectedClient]);

    React.useEffect(() => {
        setCustomFieldValues((previous) => {
            const next: Record<string, string | boolean> = { ...previous };
            dynamicFields.forEach((field) => {
                if (next[field.id] === undefined && field.defaultValue !== undefined) {
                    next[field.id] = field.defaultValue as string | boolean;
                }
            });
            return next;
        });
    }, [dynamicFields]);

    React.useEffect(() => {
        if (initialProjectName) {
            setProject(initialProjectName);
        } else {
            setProject('New project invoice');
        }
    }, [initialProjectName]);

    React.useEffect(() => {
        const packageIds = selectedClient?.defaultPackageIds ?? [];
        const itemIds = selectedClient?.defaultItemIds ?? [];
        setPendingPackageSuggestions([...packageIds]);
        setPendingItemSuggestions([...itemIds]);
    }, [selectedClient?.defaultItemIds, selectedClient?.defaultPackageIds, selectedClientId]);

    const subtotal = React.useMemo(
        () =>
            lineItems.reduce((total, item) => {
                const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
                const rate = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
                return total + quantity * rate;
            }, 0),
        [lineItems]
    );

    const taxAmount = React.useMemo(() => subtotal * (Number(taxRatePercent) / 100), [subtotal, taxRatePercent]);
    const total = React.useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

    const updateLineItem = (id: string, key: keyof InvoiceLineItemInput, value: string | number) => {
        setLineItems((items) =>
            items.map((item) => (item.id === id ? { ...item, [key]: key === 'description' ? String(value) : Number(value) } : item))
        );
    };

    const addLineItem = () => {
        setLineItems((items) => [...items, createLineItem()]);
    };

    const removeLineItem = (id: string) => {
        setLineItems((items) => {
            if (items.length === 1) {
                return [createLineItem()];
            }
            return items.filter((item) => item.id !== id);
        });
    };

    const appendLineItems = React.useCallback((entries: InvoiceLineItemInput[]) => {
        setLineItems((previous) => {
            if (previous.length === 1) {
                const [first] = previous;
                const isEmpty =
                    first &&
                    !first.description &&
                    (!Number.isFinite(first.quantity) || first.quantity <= 0 || first.quantity === 1) &&
                    (!Number.isFinite(first.unitPrice) || first.unitPrice === 0);

                if (isEmpty) {
                    return entries.length > 0 ? entries : [createLineItem()];
                }
            }

            return [...previous, ...entries];
        });
    }, []);

    const buildPackageLineItems = React.useCallback(
        (pkg: InvoicePackage): InvoiceLineItemInput[] => {
            if (Array.isArray(pkg.lineItems) && pkg.lineItems.length > 0) {
                return pkg.lineItems.map((item) =>
                    createLineItem({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice
                    })
                );
            }

            const overridesById = new Map(
                (pkg.overrides ?? []).map((override) => [override.catalogItemId, override])
            );

            const derived: InvoiceLineItemInput[] = [];

            (pkg.itemIds ?? []).forEach((catalogItemId) => {
                const catalogItem = catalogItemMap.get(catalogItemId);
                if (!catalogItem) {
                    return;
                }

                const override = overridesById.get(catalogItemId);
                const description =
                    override?.description ?? catalogItem.description ?? catalogItem.name ?? 'Invoice item';
                const quantity = override?.quantity ?? catalogItem.defaultQuantity ?? 1;
                const unitPrice = override?.unitPrice ?? catalogItem.unitPrice ?? 0;

                derived.push(
                    createLineItem({
                        description,
                        quantity,
                        unitPrice
                    })
                );
            });

            return derived;
        },
        [catalogItemMap]
    );

    const handleInsertCatalogItem = React.useCallback(
        (itemId: string) => {
            const catalogItem = catalogItemMap.get(itemId);
            if (!catalogItem) {
                return false;
            }

            appendLineItems([
                createLineItem({
                    description: catalogItem.description ?? catalogItem.name ?? 'Invoice item',
                    quantity: Math.max(0.001, catalogItem.defaultQuantity ?? 1),
                    unitPrice: Math.max(0, catalogItem.unitPrice ?? 0)
                })
            ]);
            return true;
        },
        [appendLineItems, catalogItemMap]
    );

    const handleInsertPackage = React.useCallback(
        (packageId: string) => {
            const pkg = catalogPackageMap.get(packageId);
            if (!pkg) {
                return false;
            }

            const items = buildPackageLineItems(pkg);
            if (items.length === 0) {
                return false;
            }

            appendLineItems(items);
            return true;
        },
        [appendLineItems, buildPackageLineItems, catalogPackageMap]
    );

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        const filteredLineItems = lineItems
            .map((item) => ({
                ...item,
                description: item.description.trim(),
                quantity: Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0,
                unitPrice: Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0
            }))
            .filter((item) => item.description && item.quantity > 0 && item.unitPrice >= 0);

        if (filteredLineItems.length === 0) {
            setError('Add at least one line item with a description, quantity, and rate.');
            return;
        }

        const clientName = selectedClient?.name ?? clients[0]?.name ?? 'New client';
        const payload: InvoiceBuilderSubmitValues = {
            client: clientName,
            clientEmail: clientEmail || selectedClient?.email,
            clientAddress: clientAddress || selectedClient?.address,
            project: project.trim() || 'Untitled project',
            issueDate,
            dueDate,
            notes: notes.trim() || undefined,
            taxRate: Number(taxRatePercent) / 100,
            template,
            lineItems: filteredLineItems,
            sendEmail,
            generatePaymentLink,
            customFields: customFieldValues
        };

        setIsSubmitting(true);

        try {
            await onSubmit(payload);
        } catch (submissionError) {
            const message =
                submissionError instanceof Error ? submissionError.message : 'Unable to create invoice. Please try again.';
            setError(message);
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(false);
        onClose();
    };

    const renderDynamicField = (field: QuickActionFormField) => {
        const value = customFieldValues[field.id];

        const handleChange = (nextValue: string | boolean) => {
            setCustomFieldValues((previous) => ({ ...previous, [field.id]: nextValue }));
        };

        switch (field.inputType) {
            case 'textarea':
                return (
                    <textarea
                        id={field.id}
                        className={`${inputBaseStyles} min-h-[96px]`}
                        placeholder={field.placeholder}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => handleChange(event.target.value)}
                    />
                );
            case 'select':
                return (
                    <select
                        id={field.id}
                        className={`${inputBaseStyles} pr-10`}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => handleChange(event.target.value)}
                    >
                        {(field.options ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );
            case 'checkbox':
                return (
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input
                            id={field.id}
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(event) => handleChange(event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-[#5D3BFF] focus:ring-[#4DE5FF] dark:border-slate-600"
                        />
                        <span>{field.placeholder || field.label}</span>
                    </label>
                );
            case 'number':
                return (
                    <input
                        id={field.id}
                        type="number"
                        className={inputBaseStyles}
                        placeholder={field.placeholder}
                        value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                        step={field.step ?? 1}
                        onChange={(event) => handleChange(event.target.value)}
                    />
                );
            default:
                return (
                    <input
                        id={field.id}
                        type={field.inputType === 'url' ? 'url' : 'text'}
                        className={inputBaseStyles}
                        placeholder={field.placeholder}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => handleChange(event.target.value)}
                    />
                );
        }
    };

    return (
        <Dialog.Root open onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}>
            <Dialog.Portal forceMount>
                <Dialog.Overlay asChild>
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                </Dialog.Overlay>
                <Dialog.Content asChild>
                    <motion.div
                        className="relative z-[101] w-full max-w-4xl rounded-3xl border border-white/20 bg-white/85 p-8 shadow-2xl backdrop-blur-xl transition dark:border-slate-700/60 dark:bg-slate-950/80"
                        initial={{ opacity: 0, y: 32, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -24, scale: 0.98 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-500 shadow-sm transition hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:bg-slate-900/60 dark:text-slate-300"
                                aria-label="Close"
                                disabled={isSubmitting}
                            >
                                ×
                            </button>
                        </Dialog.Close>
                        <div className="mb-6 space-y-2">
                            <span className="inline-flex items-center rounded-full border border-[#C5C0FF] bg-[#E9E7FF] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#4534FF] dark:border-[#4E46C8] dark:bg-[#2A1F67] dark:text-[#AEB1FF]">
                                Create invoice
                            </span>
                            <Dialog.Title className="text-2xl font-semibold text-slate-900 dark:text-white">
                                Generate a client invoice
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-slate-600 dark:text-slate-300">
                                Configure line items, choose a template, and deliver a branded PDF in one step.
                            </Dialog.Description>
                        </div>
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                    Client
                                </label>
                                <select
                                        className={`${inputBaseStyles} pr-10`}
                                        value={selectedClientId}
                                        onChange={(event) => setSelectedClientId(event.target.value)}
                                    >
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>
                                                {client.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="invoice-client-email" className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Client email
                                    </label>
                                    <input
                                        id="invoice-client-email"
                                        type="email"
                                        className={inputBaseStyles}
                                        placeholder="client@example.com"
                                        value={clientEmail}
                                        onChange={(event) => setClientEmail(event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="invoice-project" className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Project or service
                                    </label>
                                    <input
                                        id="invoice-project"
                                        type="text"
                                        className={inputBaseStyles}
                                        placeholder="Brand lifestyle campaign"
                                        value={project}
                                        onChange={(event) => setProject(event.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="invoice-client-address" className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Billing address
                                    </label>
                                    <input
                                        id="invoice-client-address"
                                        type="text"
                                        className={inputBaseStyles}
                                        placeholder="500 Market Street, San Francisco, CA"
                                        value={clientAddress}
                                        onChange={(event) => setClientAddress(event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="invoice-issue-date" className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Issue date
                                    </label>
                                    <input
                                        id="invoice-issue-date"
                                        type="date"
                                        className={inputBaseStyles}
                                        value={issueDate}
                                        onChange={(event) => setIssueDate(event.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="invoice-due-date" className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Due date
                                    </label>
                                    <input
                                        id="invoice-due-date"
                                        type="date"
                                        className={inputBaseStyles}
                                        value={dueDate}
                                        onChange={(event) => setDueDate(event.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="invoice-tax-rate" className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Tax rate (%)
                                    </label>
                                    <input
                                        id="invoice-tax-rate"
                                        type="number"
                                        className={inputBaseStyles}
                                        value={taxRatePercent}
                                        onChange={(event) => setTaxRatePercent(Number(event.target.value))}
                                        min={0}
                                        step={0.5}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="invoice-notes" className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Notes for client
                                    </label>
                                    <textarea
                                        id="invoice-notes"
                                        className={`${inputBaseStyles} min-h-[96px]`}
                                        placeholder="Add payment terms, delivery timelines, or next steps."
                                        value={notes}
                                        onChange={(event) => setNotes(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Delivery options
                                    </p>
                                    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">Email invoice</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Send a PDF download link to the client immediately.</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={sendEmail}
                                            onChange={(event) => setSendEmail(event.target.checked)}
                                            className="h-5 w-5 rounded border-slate-300 text-[#5D3BFF] focus:ring-[#4DE5FF] dark:border-slate-600"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">Enable payment link</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Create a Stripe checkout link for instant online payment.</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={generatePaymentLink}
                                            onChange={(event) => setGeneratePaymentLink(event.target.checked)}
                                            className="h-5 w-5 rounded border-slate-300 text-[#5D3BFF] focus:ring-[#4DE5FF] dark:border-slate-600"
                                        />
                                    </label>
                                </div>
                                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Template
                                    </p>
                                    <div className="grid gap-3">
                                        {templateOptions.map((option) => {
                                            const isActive = option.id === template;
                                            return (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => setTemplate(option.id)}
                                                    className={[
                                                        'rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                                                        isActive
                                                            ? 'border-indigo-500 bg-indigo-50/80 shadow-sm dark:border-indigo-400 dark:bg-indigo-500/10'
                                                            : 'border-slate-200 bg-white/70 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-indigo-400'
                                                    ].join(' ')}
                                                >
                                                    <p className="font-semibold text-slate-900 dark:text-white">{option.label}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {dynamicFields.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {dynamicFields.map((field) => (
                                        <div key={field.id} className="space-y-2">
                                            <label htmlFor={field.id} className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                                {field.label}
                                            </label>
                                            {renderDynamicField({
                                                id: field.id,
                                                label: field.label,
                                                inputType: field.inputType === 'url' ? 'url' : field.inputType,
                                                placeholder: field.placeholder,
                                                helperText: field.description,
                                                defaultValue: field.defaultValue
                                            })}
                                            {field.description ? (
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{field.description}</p>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Line items
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addLineItem}
                                        className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                                    >
                                        + Add item
                                    </button>
                                </div>
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                                        <thead className="bg-slate-100/70 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3">Description</th>
                                                <th className="px-4 py-3">Qty</th>
                                                <th className="px-4 py-3">Rate</th>
                                                <th className="px-4 py-3">Total</th>
                                                <th className="px-4 py-3" aria-label="Actions" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {lineItems.map((item) => (
                                            <tr key={item.id} className="align-top">
                                                <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            className={inputBaseStyles}
                                                            placeholder="Creative direction, Retainer"
                                                            value={item.description}
                                                            onChange={(event) => updateLineItem(item.id, 'description', event.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            className={inputBaseStyles}
                                                            value={item.quantity}
                                                            min={0}
                                                            step={0.25}
                                                            onChange={(event) => updateLineItem(item.id, 'quantity', event.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            className={inputBaseStyles}
                                                            value={item.unitPrice}
                                                            min={0}
                                                            step={25}
                                                            onChange={(event) => updateLineItem(item.id, 'unitPrice', event.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                                                        {currencyFormatter.format((item.quantity || 0) * (item.unitPrice || 0))}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLineItem(item.id)}
                                                            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-[#D61B7B]"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                                Insert saved item
                                            </label>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <select
                                                    className={`${inputBaseStyles} flex-1 pr-10`}
                                                    value={selectedCatalogItemId}
                                                    onChange={(event) => setSelectedCatalogItemId(event.target.value)}
                                                    disabled={isCatalogItemsLoading || (catalogItems?.length ?? 0) === 0}
                                                >
                                                    <option value="">
                                                        {isCatalogItemsLoading ? 'Loading…' : 'Select saved service'}
                                                    </option>
                                                    {(catalogItems ?? []).map((item) => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-200"
                                                    onClick={() => {
                                                        if (selectedCatalogItemId && handleInsertCatalogItem(selectedCatalogItemId)) {
                                                            setPendingItemSuggestions((previous) =>
                                                                previous.filter((id) => id !== selectedCatalogItemId)
                                                            );
                                                            setSelectedCatalogItemId('');
                                                        }
                                                    }}
                                                    disabled={!selectedCatalogItemId}
                                                >
                                                    Add saved item
                                                </button>
                                            </div>
                                            {catalogItemsError ? (
                                                <p className="text-xs text-[#D61B7B]">
                                                    {catalogItemsError instanceof Error
                                                        ? catalogItemsError.message
                                                        : 'Unable to load saved services.'}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                                Insert package
                                            </label>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <select
                                                    className={`${inputBaseStyles} flex-1 pr-10`}
                                                    value={selectedPackageId}
                                                    onChange={(event) => setSelectedPackageId(event.target.value)}
                                                    disabled={isCatalogPackagesLoading || (catalogPackages?.length ?? 0) === 0}
                                                >
                                                    <option value="">
                                                        {isCatalogPackagesLoading ? 'Loading…' : 'Select package'}
                                                    </option>
                                                    {(catalogPackages ?? []).map((pkg) => (
                                                        <option key={pkg.id} value={pkg.id}>
                                                            {pkg.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-200"
                                                    onClick={() => {
                                                        if (selectedPackageId && handleInsertPackage(selectedPackageId)) {
                                                            setPendingPackageSuggestions((previous) =>
                                                                previous.filter((id) => id !== selectedPackageId)
                                                            );
                                                            setSelectedPackageId('');
                                                        }
                                                    }}
                                                    disabled={!selectedPackageId}
                                                >
                                                    Add package
                                                </button>
                                            </div>
                                            {catalogPackagesError ? (
                                                <p className="text-xs text-[#D61B7B]">
                                                    {catalogPackagesError instanceof Error
                                                        ? catalogPackagesError.message
                                                        : 'Unable to load invoice packages.'}
                                                </p>
                                            ) : null}
                                        </div>
                                        {(pendingPackageSuggestions.length > 0 || pendingItemSuggestions.length > 0) && (
                                            <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 text-xs text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="font-semibold uppercase tracking-[0.24em]">
                                                        Suggested presets
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPendingPackageSuggestions([]);
                                                            setPendingItemSuggestions([]);
                                                        }}
                                                        className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-500 transition hover:text-indigo-700 dark:text-indigo-200 dark:hover:text-indigo-100"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                                <p className="mt-1 text-[11px] text-indigo-600/80 dark:text-indigo-200/70">
                                                    {selectedClient?.name ? `Recommended for ${selectedClient.name}` : 'Recommended presets'}
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {pendingPackageSuggestions
                                                        .map((packageId) => catalogPackageMap.get(packageId))
                                                        .filter((pkg): pkg is InvoicePackage => Boolean(pkg))
                                                        .map((pkg) => (
                                                            <button
                                                                key={`suggested-package-${pkg.id}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (handleInsertPackage(pkg.id)) {
                                                                        setPendingPackageSuggestions((previous) =>
                                                                            previous.filter((id) => id !== pkg.id)
                                                                        );
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600 shadow-sm ring-1 ring-indigo-200 transition hover:bg-white dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-500/40"
                                                            >
                                                                + {pkg.name}
                                                            </button>
                                                        ))}
                                                    {pendingItemSuggestions
                                                        .map((itemId) => catalogItemMap.get(itemId))
                                                        .filter((item): item is InvoiceCatalogItem => Boolean(item))
                                                        .map((item) => (
                                                            <button
                                                                key={`suggested-item-${item.id}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (handleInsertCatalogItem(item.id)) {
                                                                        setPendingItemSuggestions((previous) =>
                                                                            previous.filter((id) => id !== item.id)
                                                                        );
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600 shadow-sm ring-1 ring-indigo-200 transition hover:bg-white dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-500/40"
                                                            >
                                                                + {item.name}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addLineItem}
                                        className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                                    >
                                        + Add blank item
                                    </button>
                                </div>
                                <div className="flex flex-col items-end gap-1 text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex w-full max-w-xs items-center justify-between">
                                        <span>Subtotal</span>
                                        <span>{currencyFormatter.format(subtotal)}</span>
                                    </div>
                                    <div className="flex w-full max-w-xs items-center justify-between">
                                        <span>Tax ({taxRatePercent.toFixed(1)}%)</span>
                                        <span>{currencyFormatter.format(taxAmount)}</span>
                                    </div>
                                    <div className="flex w-full max-w-xs items-center justify-between text-base font-semibold text-slate-900 dark:text-white">
                                        <span>Total</span>
                                        <span>{currencyFormatter.format(total)}</span>
                                    </div>
                                </div>
                            </div>

                            {error ? <p className="text-sm text-[#D61B7B]">{error}</p> : null}
                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSubmitting ? 'Generating…' : 'Generate invoice'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default InvoiceBuilderModal;
