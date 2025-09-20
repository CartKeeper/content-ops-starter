import * as React from 'react';
import Head from 'next/head';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import * as Dialog from '@radix-ui/react-dialog';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef, PaginationState, RowSelectionState, SortingState } from '@tanstack/react-table';

import { CrmAuthGuard, WorkspaceLayout } from '../../components/crm';
import DataToolbar, { type SortOption, type ToolbarFilter } from '../../components/data/DataToolbar';
import DataTable from '../../components/data/DataTable';
import { formatDate } from '../../lib/formatters';
import type { ContactRecord } from '../../types/contact';
import { getContactName } from '../../types/contact';
import { deriveStage, type ContactStage } from '../../lib/contacts';

type OwnerOption = { id: string; name: string | null };

type ContactsApiResponse = {
    data: ContactRecord[];
    meta: {
        page: number;
        pageSize: number;
        total: number;
        availableFilters: {
            owners: OwnerOption[];
            statuses: Array<NonNullable<ContactRecord['status']>>;
        };
    };
};

type MetricsResponse = {
    total: number;
    withEmail: number;
    withPhone: number;
    newLast30?: number;
};

type ContactTableRow = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    stage: ContactStage;
    status: ContactRecord['status'];
    owner: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};

type ToastMessage = { id: string; title: string; tone: 'success' | 'error'; description?: string };

const CONTACT_SORT_OPTIONS: Array<SortOption & { state: SortingState }> = [
    { id: 'name-asc', label: 'Name (A-Z)', state: [{ id: 'name', desc: false }] },
    { id: 'name-desc', label: 'Name (Z-A)', state: [{ id: 'name', desc: true }] },
    { id: 'created-desc', label: 'Newest first', state: [{ id: 'createdAt', desc: true }] },
    { id: 'created-asc', label: 'Oldest first', state: [{ id: 'createdAt', desc: false }] },
    { id: 'updated-desc', label: 'Recently updated', state: [{ id: 'updatedAt', desc: true }] },
    { id: 'updated-asc', label: 'Least recently updated', state: [{ id: 'updatedAt', desc: false }] },
];

const DEFAULT_CONTACT_SORT = CONTACT_SORT_OPTIONS[0];

const STAGE_FILTER_OPTIONS: ToolbarFilter['options'] = [
    { value: 'new', label: 'New' },
    { value: 'warm', label: 'Warm' },
    { value: 'hot', label: 'Hot' },
];

const fetcher = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Request failed');
    }
    return (await response.json()) as T;
};

export default function ContactsPage() {
    return (
        <CrmAuthGuard>
            <WorkspaceLayout>
                <Head>
                    <title>Contacts | Codex CRM</title>
                </Head>
                <ContactsWorkspace />
            </WorkspaceLayout>
        </CrmAuthGuard>
    );
}

function ContactsWorkspace() {
    const [search, setSearch] = React.useState('');
    const [stageFilter, setStageFilter] = React.useState<string[]>([]);
    const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
    const [ownerFilter, setOwnerFilter] = React.useState<string[]>([]);
    const [sortValue, setSortValue] = React.useState<string>(DEFAULT_CONTACT_SORT.id);
    const [sorting, setSorting] = React.useState<SortingState>(DEFAULT_CONTACT_SORT.state);
    const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
    const [notifications, setNotifications] = React.useState<ToastMessage[]>([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const queryKey = React.useMemo(() => {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (stageFilter.length > 0) params.set('stage', stageFilter.join(','));
        if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
        if (ownerFilter.length > 0) params.set('owner', ownerFilter.join(','));
        params.set('sort', sortValue);
        params.set('page', String(pagination.pageIndex + 1));
        params.set('pageSize', String(pagination.pageSize));
        const serialized = params.toString();
        return serialized ? `/api/contacts?${serialized}` : '/api/contacts';
    }, [ownerFilter, pagination.pageIndex, pagination.pageSize, search, sortValue, stageFilter, statusFilter]);

    const {
        data: contactsResponse,
        error: contactsError,
        isValidating: isContactsLoading,
        mutate: mutateContacts,
    } = useSWR<ContactsApiResponse>(queryKey, fetcher, {
        keepPreviousData: true,
        revalidateOnFocus: false,
    });

    const { data: metricsResponse, mutate: mutateMetrics } = useSWR<MetricsResponse>('/api/contacts/metrics', fetcher, {
        revalidateOnFocus: false,
    });

    React.useEffect(() => {
        const match = CONTACT_SORT_OPTIONS.find((option) => option.id === sortValue);
        setSorting(match?.state ?? DEFAULT_CONTACT_SORT.state);
    }, [sortValue]);

    const ownerLabelMap = React.useMemo(() => {
        const map = new Map<string, string | null>();
        contactsResponse?.meta.availableFilters.owners.forEach((owner) => {
            map.set(owner.id, owner.name ?? owner.id);
        });
        return map;
    }, [contactsResponse?.meta.availableFilters.owners]);

    const tableRows = React.useMemo<ContactTableRow[]>(() => {
        if (!contactsResponse) {
            return [];
        }

        return contactsResponse.data.map((record) => {
            const ownerId = record.owner_user_id ?? null;
            return {
                id: record.id,
                name: getContactName(record),
                email: record.email,
                phone: record.phone,
                stage: deriveStage(record.status),
                status: record.status ?? 'lead',
                owner: ownerId ? ownerLabelMap.get(ownerId) ?? ownerId : null,
                createdAt: record.created_at ?? null,
                updatedAt: record.updated_at ?? null,
            } satisfies ContactTableRow;
        });
    }, [contactsResponse, ownerLabelMap]);

    const pageCount = React.useMemo(() => {
        if (!contactsResponse) {
            return 1;
        }
        const total = contactsResponse.meta.total;
        const size = contactsResponse.meta.pageSize || 1;
        return Math.max(1, Math.ceil(total / size));
    }, [contactsResponse]);

    const ownerOptions = React.useMemo(() => {
        const options = contactsResponse?.meta.availableFilters.owners ?? [];
        const entries = options.map((owner) => ({ value: owner.id, label: owner.name ?? owner.id }));
        if (entries.length > 0 || contactsResponse) {
            entries.unshift({ value: 'unassigned', label: 'Unassigned' });
        }
        return entries;
    }, [contactsResponse]);

    const statusOptions = React.useMemo(() => {
        const statuses = contactsResponse?.meta.availableFilters.statuses ?? [];
        return statuses.map((status) => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) }));
    }, [contactsResponse]);

    const filters = React.useMemo<ToolbarFilter[]>(() => {
        const entries: ToolbarFilter[] = [
            { id: 'stage', label: 'Stage', options: STAGE_FILTER_OPTIONS, value: stageFilter, onChange: setStageFilter },
        ];

        if (statusOptions.length > 0) {
            entries.push({ id: 'status', label: 'Status', options: statusOptions, value: statusFilter, onChange: setStatusFilter });
        }

        if (ownerOptions.length > 0) {
            entries.push({ id: 'owner', label: 'Owner', options: ownerOptions, value: ownerFilter, onChange: setOwnerFilter });
        }

        return entries;
    }, [ownerFilter, ownerOptions, stageFilter, statusFilter, statusOptions]);

    const metrics = React.useMemo(() => {
        const base = metricsResponse ?? { total: 0, withEmail: 0, withPhone: 0 };
        if (typeof metricsResponse?.newLast30 === 'number') {
            return { ...base, newLast30: metricsResponse.newLast30 };
        }
        return base;
    }, [metricsResponse]);

    const columns = React.useMemo<ColumnDef<ContactTableRow>[]>(() => [
        {
            accessorKey: 'name',
            header: 'Contact',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-white">{row.original.name}</span>
                    <span className="text-xs text-slate-400">
                        {row.original.email ?? 'No email'} • {row.original.phone ?? 'No phone'}
                    </span>
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: 'stage',
            header: 'Stage',
            cell: ({ row }) => (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStageBadge(row.original.stage)}`}>
                    {row.original.stage.toUpperCase()}
                </span>
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'owner',
            header: 'Owner',
            cell: ({ row }) => <span className="text-sm text-slate-300">{row.original.owner ?? 'Unassigned'}</span>,
            enableSorting: false,
        },
        {
            accessorKey: 'createdAt',
            header: 'Created',
            cell: ({ row }) => <span className="text-sm text-slate-300">{row.original.createdAt ? formatDate(row.original.createdAt) : '—'}</span>,
            enableSorting: true,
        },
        {
            accessorKey: 'updatedAt',
            header: 'Updated',
            cell: ({ row }) => <span className="text-sm text-slate-300">{row.original.updatedAt ? formatDate(row.original.updatedAt) : '—'}</span>,
            enableSorting: true,
        },
    ], []);

    React.useEffect(() => {
        if (notifications.length === 0) {
            return;
        }

        const timer = window.setTimeout(() => {
            setNotifications((previous) => previous.slice(1));
        }, 4000);

        return () => window.clearTimeout(timer);
    }, [notifications]);

    const hasActiveFilters = Boolean(search.trim()) || stageFilter.length > 0 || statusFilter.length > 0 || ownerFilter.length > 0;

    const addNotification = React.useCallback((title: string, tone: ToastMessage['tone'], description?: string) => {
        setNotifications((previous) => [
            ...previous,
            { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title, tone, description },
        ]);
    }, []);

    const handleSortingChange = React.useCallback(
        (updater: SortingState | ((old: SortingState) => SortingState)) => {
            setSorting((previous) => {
                const nextState = typeof updater === 'function' ? updater(previous) : updater;
                const match = CONTACT_SORT_OPTIONS.find((option) => option.state.length === nextState.length && option.state.every((entry, index) => entry.id === nextState[index]?.id && entry.desc === nextState[index]?.desc));
                setSortValue(match?.id ?? DEFAULT_CONTACT_SORT.id);
                return nextState;
            });
        },
        []
    );

    const emptyMessage = React.useMemo(() => {
        const workspaceEmpty = metrics.total === 0;
        if (workspaceEmpty) {
            return (
                <div className="space-y-4">
                    <p className="text-slate-300">No contacts yet. Start building your network.</p>
                    <button
                        type="button"
                        onClick={() => setIsDialogOpen(true)}
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-600"
                    >
                        Add contact
                    </button>
                </div>
            );
        }

        if (hasActiveFilters) {
            return <p>No contacts match your filters.</p>;
        }

        return <p>No contacts found.</p>;
    }, [hasActiveFilters, metrics.total]);

    const handleContactCreated = React.useCallback(
        async (record: ContactRecord) => {
            addNotification('Contact added', 'success', getContactName(record));
            setPagination((previous) => ({ ...previous, pageIndex: 0 }));
            setRowSelection({});
            await Promise.all([mutateContacts(), mutateMetrics()]);
        },
        [addNotification, mutateContacts, mutateMetrics]
    );

    const handleContactError = React.useCallback(
        (message: string) => {
            addNotification('Unable to add contact', 'error', message);
        },
        [addNotification]
    );

    const kpiCards = React.useMemo(() => {
        const cards: Array<{ id: string; label: string; value: number; helper: string }> = [
            { id: 'total', label: 'Total contacts', value: metrics.total, helper: 'Across your workspace' },
            { id: 'email', label: 'With email', value: metrics.withEmail, helper: 'Reachable via inbox' },
            { id: 'phone', label: 'With phone', value: metrics.withPhone, helper: 'Ready for quick calls' },
        ];

        if (typeof metrics.newLast30 === 'number') {
            cards.push({ id: 'recent', label: 'New (30 days)', value: metrics.newLast30, helper: 'Added in the last 30 days' });
        }

        return cards;
    }, [metrics.newLast30, metrics.total, metrics.withEmail, metrics.withPhone]);

    const kpiGridClass = kpiCards.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

    return (
        <div className="flex flex-col gap-6">
            <section className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${kpiGridClass}`}>
                {kpiCards.map((card) => (
                    <KpiCard key={card.id} label={card.label} value={card.value} helper={card.helper} />
                ))}
            </section>

            {contactsError ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{contactsError.message}</div>
            ) : null}

            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`rounded-2xl border p-3 text-sm ${
                        notification.tone === 'success'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    }`}
                >
                    <p className="font-semibold">{notification.title}</p>
                    {notification.description ? (
                        <p className="mt-1 text-xs text-inherit opacity-80">{notification.description}</p>
                    ) : null}
                </div>
            ))}

            <DataToolbar
                searchValue={search}
                onSearchChange={(value) => {
                    setSearch(value);
                    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
                }}
                searchPlaceholder="Search contacts by name, email, or phone"
                filters={filters}
                hasActiveFilters={hasActiveFilters}
                onResetFilters={() => {
                    setStageFilter([]);
                    setStatusFilter([]);
                    setOwnerFilter([]);
                }}
                sortOptions={CONTACT_SORT_OPTIONS.map(({ id, label }) => ({ id, label }))}
                sortValue={sortValue}
                onSortChange={setSortValue}
                primaryAction={{ label: 'Add contact', onClick: () => setIsDialogOpen(true) }}
                pageSize={pagination.pageSize}
                onPageSizeChange={(pageSize) => setPagination({ pageIndex: 0, pageSize })}
            />

            <DataTable<ContactTableRow>
                columns={columns}
                data={tableRows}
                sorting={sorting}
                onSortingChange={handleSortingChange}
                pagination={pagination}
                onPaginationChange={setPagination}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                manualPagination
                manualSorting
                pageCount={pageCount}
                getRowId={(row) => row.id}
                isLoading={isContactsLoading && !contactsResponse}
                emptyMessage={emptyMessage}
            />

            <AddContactDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={handleContactCreated}
                onError={handleContactError}
            />
        </div>
    );
}

function KpiCard({ label, value, helper }: { label: string; value: number; helper: string }) {
    return (
        <div className="flex min-h-[104px] max-h-32 flex-col justify-center gap-3 rounded-3xl border border-slate-800/70 bg-slate-950/60 p-5 shadow-xl shadow-slate-950/40">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-3xl font-semibold leading-none text-white">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{helper}</p>
        </div>
    );
}

function getStageBadge(stage: ContactStage): string {
    switch (stage) {
        case 'hot':
            return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
        case 'warm':
            return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
        default:
            return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200';
    }
}

const addContactSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z
        .string()
        .trim()
        .optional()
        .transform((value) => (value === '' ? undefined : value))
        .refine((value) => !value || z.string().email().safeParse(value).success, 'Enter a valid email'),
    phone: z
        .string()
        .trim()
        .optional()
        .transform((value) => (value === '' ? undefined : value)),
});

type AddContactFormValues = z.infer<typeof addContactSchema>;

type AddContactDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (record: ContactRecord) => Promise<void> | void;
    onError: (message: string) => void;
};

function AddContactDialog({ open, onOpenChange, onSuccess, onError }: AddContactDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AddContactFormValues>({
        resolver: zodResolver(addContactSchema),
        defaultValues: { name: '', email: '', phone: '' },
    });

    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (!open) {
            reset({ name: '', email: '', phone: '' });
        }
    }, [open, reset]);

    const onSubmit = handleSubmit(async (values) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: values.name,
                    email: values.email,
                    phone: values.phone,
                }),
            });

            const payload = (await response.json().catch(() => ({}))) as { data?: ContactRecord; error?: string };

            if (!response.ok || !payload.data) {
                throw new Error(payload.error ?? 'Unable to save contact');
            }

            await onSuccess(payload.data);
            onOpenChange(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to save contact';
            onError(message);
        } finally {
            setIsSubmitting(false);
        }
    });

    return (
        <Dialog.Root open={open} onOpenChange={(next) => (!isSubmitting ? onOpenChange(next) : undefined)}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur" />
                <Dialog.Content className="fixed inset-0 z-50 mx-auto my-12 flex h-fit w-full max-w-lg flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-950/95 p-6 text-slate-100 shadow-2xl focus:outline-none">
                    <header className="flex items-start justify-between gap-4">
                        <div>
                            <Dialog.Title className="text-xl font-semibold text-white">Add contact</Dialog.Title>
                            <Dialog.Description className="text-sm text-slate-400">Capture a new lead without leaving the table.</Dialog.Description>
                        </div>
                        <Dialog.Close
                            asChild
                            disabled={isSubmitting}
                        >
                            <button
                                type="button"
                                className="rounded-full border border-transparent bg-slate-800/80 p-2 text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                                    <path
                                        fillRule="evenodd"
                                        d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10L5.22 6.28a.75.75 0 0 1 0-1.06Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </Dialog.Close>
                    </header>

                    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="contact-name" className="text-sm font-medium text-slate-200">
                                Name <span className="text-rose-400">*</span>
                            </label>
                            <input
                                id="contact-name"
                                type="text"
                                className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                                placeholder="Jamie Rivera"
                                {...register('name')}
                                autoFocus
                                disabled={isSubmitting}
                            />
                            {errors.name ? <p className="text-xs text-rose-300">{errors.name.message}</p> : null}
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="contact-email" className="text-sm font-medium text-slate-200">
                                Email
                            </label>
                            <input
                                id="contact-email"
                                type="email"
                                className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                                placeholder="jamie@example.com"
                                {...register('email')}
                                disabled={isSubmitting}
                            />
                            {errors.email ? <p className="text-xs text-rose-300">{errors.email.message}</p> : null}
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="contact-phone" className="text-sm font-medium text-slate-200">
                                Phone
                            </label>
                            <input
                                id="contact-phone"
                                type="tel"
                                className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                                placeholder="(555) 010-1234"
                                {...register('phone')}
                                disabled={isSubmitting}
                            />
                            {errors.phone ? <p className="text-xs text-rose-300">{errors.phone.message}</p> : null}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Dialog.Close asChild disabled={isSubmitting}>
                                <button
                                    type="button"
                                    className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </Dialog.Close>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="inline-flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                                        Saving…
                                    </span>
                                ) : (
                                    'Save contact'
                                )}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
