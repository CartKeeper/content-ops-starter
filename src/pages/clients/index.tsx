import * as React from 'react';
import Head from 'next/head';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { CrmAuthGuard, WorkspaceLayout } from '../../components/crm';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { formatCurrency, formatDate } from '../../lib/formatters';

const STATUS_OPTIONS = ['Lead', 'Active', 'Inactive'] as const;

type ClientStatus = (typeof STATUS_OPTIONS)[number];

type ClientRecord = {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: ClientStatus;
    outstanding_cents: number;
    last_activity: string | null;
    upcoming_shoot: string | null;
    portal_url: string | null;
    portal_enabled: boolean;
    tags: string[] | null;
};

type ClientsApiResponse = {
    data: ClientRecord[];
    page: number;
    pageSize: number;
    total: number;
};

type MetricsResponse = {
    activeCount: number;
    outstandingCents: number;
    upcomingCount60d: number;
    portalReadyCount: number;
};

const SORT_OPTIONS = [
    { id: 'name-asc', label: 'Name (A–Z)' },
    { id: 'name-desc', label: 'Name (Z–A)' },
    { id: 'created-desc', label: 'Newest first' },
    { id: 'created-asc', label: 'Oldest first' },
    { id: 'status-asc', label: 'Status (A–Z)' },
    { id: 'status-desc', label: 'Status (Z–A)' },
    { id: 'outstanding-desc', label: 'Outstanding (high)' },
    { id: 'upcoming-asc', label: 'Upcoming shoot (soonest)' },
    { id: 'upcoming-desc', label: 'Upcoming shoot (latest)' }
] as const;

type SortOptionId = (typeof SORT_OPTIONS)[number]['id'];

const fetcher = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) {
        let message = 'Request failed';
        try {
            const body = (await response.json()) as { error?: string };
            if (body?.error) {
                message = body.error;
            }
        } catch (error) {
            // ignore
        }
        throw new Error(message);
    }
    return (await response.json()) as T;
};

function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = React.useState<T>(value);

    React.useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

type CreateClientFormValues = {
    name: string;
    email: string;
    phone: string;
    status: ClientStatus;
    upcoming_shoot: string;
    tags: string;
};

const createClientFormSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z
        .union([z.string().trim().email('Enter a valid email'), z.literal('')])
        .optional(),
    phone: z.union([z.string().trim(), z.literal('')]).optional(),
    status: z.enum(STATUS_OPTIONS),
    upcoming_shoot: z
        .union([z.string().trim(), z.literal('')])
        .optional()
        .refine((value) => {
            if (!value || value.length === 0) {
                return true;
            }
            return !Number.isNaN(Date.parse(value));
        }, 'Enter a valid date'),
    tags: z.union([z.string(), z.literal('')]).optional()
});

export default function ClientsPage() {
    return (
        <CrmAuthGuard>
            <WorkspaceLayout>
                <Head>
                    <title>Clients | Codex CRM</title>
                </Head>
                <ClientsWorkspace />
            </WorkspaceLayout>
        </CrmAuthGuard>
    );
}

type ToastState = {
    id: number;
    message: string;
    variant: 'success' | 'error';
};

function ClientsWorkspace() {
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<ClientStatus | 'All'>('All');
    const [sort, setSort] = React.useState<SortOptionId>('name-asc');
    const [isDialogOpen, setDialogOpen] = React.useState(false);
    const [toast, setToast] = React.useState<ToastState | null>(null);

    const debouncedSearch = useDebouncedValue(search, 300);

    React.useEffect(() => {
        if (!toast) {
            return undefined;
        }
        const timer = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const clientsKey = React.useMemo(() => {
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) {
            params.set('search', debouncedSearch.trim());
        }
        if (statusFilter !== 'All') {
            params.set('status', statusFilter);
        }
        if (sort !== 'name-asc') {
            params.set('sort', sort);
        }
        params.set('page', '1');
        params.set('pageSize', '50');
        const queryString = params.toString();
        return queryString.length > 0 ? `/api/clients?${queryString}` : '/api/clients?page=1&pageSize=50';
    }, [debouncedSearch, sort, statusFilter]);

    const {
        data: clientsData,
        error: clientsError,
        isLoading: isLoadingClients,
        mutate: mutateClients
    } = useSWR<ClientsApiResponse>(clientsKey, fetcher);

    const { data: metricsData, mutate: mutateMetrics } = useSWR<MetricsResponse>('/api/clients/metrics', fetcher);

    const clients = clientsData?.data ?? [];
    const showEmptyState = !isLoadingClients && clients.length === 0;

    const handleClientCreated = React.useCallback(
        (client: ClientRecord) => {
            setDialogOpen(false);
            setToast({ id: Date.now(), message: `${client.name} added`, variant: 'success' });
            void mutateClients();
            void mutateMetrics();
        },
        [mutateClients, mutateMetrics]
    );

    const handleClientError = React.useCallback((message: string) => {
        setToast({ id: Date.now(), message, variant: 'error' });
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    label="Active clients"
                    value={String(metricsData?.activeCount ?? 0)}
                    helper="Status set to Active"
                />
                <KpiCard
                    label="Outstanding balance"
                    value={formatCurrency(metricsData?.outstandingCents ?? 0)}
                    helper="Across all clients"
                />
                <KpiCard
                    label="Upcoming shoots"
                    value={String(metricsData?.upcomingCount60d ?? 0)}
                    helper="Next 60 days"
                />
                <KpiCard
                    label="Portal ready"
                    value={String(metricsData?.portalReadyCount ?? 0)}
                    helper="Client portal enabled"
                />
            </section>

            <section className="flex flex-col gap-4 rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/50">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                        <div className="relative min-w-[220px] flex-1">
                            <Input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search clients by name, email, or phone"
                                aria-label="Search clients"
                            />
                        </div>
                        <div className="flex min-w-[150px] flex-col gap-1 text-xs text-slate-400">
                            <span>Status</span>
                            <Select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as ClientStatus | 'All')}
                                aria-label="Filter by status"
                            >
                                <option value="All">All statuses</option>
                                {STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="flex min-w-[180px] flex-col gap-1 text-xs text-slate-400">
                            <span>Sort</span>
                            <Select
                                value={sort}
                                onChange={(event) => setSort(event.target.value as SortOptionId)}
                                aria-label="Sort clients"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                    <Button type="button" className="w-full md:ml-auto md:w-auto" onClick={() => setDialogOpen(true)}>
                        Add client
                    </Button>
                </div>

                {clientsError ? (
                    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                        {clientsError.message}
                    </div>
                ) : null}

                {showEmptyState ? (
                    <EmptyState onAddClient={() => setDialogOpen(true)} />
                ) : (
                    <ClientsTable clients={clients} isLoading={isLoadingClients} />
                )}
            </section>

            <AddClientDialog
                open={isDialogOpen}
                onOpenChange={setDialogOpen}
                onCreated={handleClientCreated}
                onError={handleClientError}
            />

            <Toast toast={toast} />
        </div>
    );
}

type AddClientDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (client: ClientRecord) => void;
    onError: (message: string) => void;
};

const defaultFormValues: CreateClientFormValues = {
    name: '',
    email: '',
    phone: '',
    status: 'Lead',
    upcoming_shoot: '',
    tags: ''
};

function AddClientDialog({ open, onOpenChange, onCreated, onError }: AddClientDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        setError,
        clearErrors,
        formState: { errors, isSubmitting }
    } = useForm<CreateClientFormValues>({
        defaultValues: defaultFormValues
    });

    const [serverError, setServerError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!open) {
            reset(defaultFormValues);
            clearErrors();
            setServerError(null);
        }
    }, [clearErrors, open, reset]);

    const onSubmit = handleSubmit(async (values) => {
        clearErrors();
        setServerError(null);

        const parsed = createClientFormSchema.safeParse(values);
        if (!parsed.success) {
            const fieldErrors: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
                const field = issue.path[0];
                if (typeof field === 'string' && !fieldErrors[field]) {
                    fieldErrors[field] = issue.message;
                }
            });
            Object.entries(fieldErrors).forEach(([field, message]) => {
                setError(field as keyof CreateClientFormValues, { message });
            });
            return;
        }

        const data = parsed.data;
        const payload = {
            name: data.name.trim(),
            email: data.email && data.email.trim().length > 0 ? data.email.trim() : undefined,
            phone: data.phone && data.phone.trim().length > 0 ? data.phone.trim() : undefined,
            status: data.status,
            upcoming_shoot: data.upcoming_shoot && data.upcoming_shoot.trim().length > 0 ? data.upcoming_shoot : undefined,
            tags:
                data.tags && data.tags.trim().length > 0
                    ? data.tags
                          .split(',')
                          .map((tag) => tag.trim())
                          .filter((tag) => tag.length > 0)
                    : []
        };

        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const body = (await response.json()) as { data?: ClientRecord; error?: string; fieldErrors?: Record<string, string> };

            if (!response.ok || !body?.data) {
                if (body?.fieldErrors) {
                    Object.entries(body.fieldErrors).forEach(([field, message]) => {
                        setError(field as keyof CreateClientFormValues, { message });
                    });
                }
                const message = body?.error ?? 'Failed to create client';
                setServerError(message);
                onError(message);
                return;
            }

            onCreated(body.data);
        } catch (error) {
            const message = 'Unable to save client right now.';
            setServerError(message);
            onError(message);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add client</DialogTitle>
                    <DialogDescription>Capture the essentials so you can schedule shoots and share portals later.</DialogDescription>
                </DialogHeader>
                <form className="flex flex-col gap-4" onSubmit={onSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="client-name">Name</Label>
                        <Input id="client-name" placeholder="Client name" {...register('name')} aria-invalid={Boolean(errors.name)} />
                        {errors.name ? <FieldError message={errors.name.message} /> : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="client-email">Email</Label>
                            <Input id="client-email" type="email" placeholder="name@example.com" {...register('email')} aria-invalid={Boolean(errors.email)} />
                            {errors.email ? <FieldError message={errors.email.message} /> : null}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="client-phone">Phone</Label>
                            <Input id="client-phone" placeholder="(555) 555-5555" {...register('phone')} aria-invalid={Boolean(errors.phone)} />
                            {errors.phone ? <FieldError message={errors.phone.message} /> : null}
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="client-status">Status</Label>
                            <Select id="client-status" {...register('status')} aria-invalid={Boolean(errors.status)}>
                                {STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </Select>
                            {errors.status ? <FieldError message={errors.status.message} /> : null}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="client-upcoming">Upcoming shoot</Label>
                            <Input id="client-upcoming" type="date" {...register('upcoming_shoot')} aria-invalid={Boolean(errors.upcoming_shoot)} />
                            {errors.upcoming_shoot ? <FieldError message={errors.upcoming_shoot.message} /> : null}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="client-tags">Tags</Label>
                        <Textarea
                            id="client-tags"
                            placeholder="wedding, vip, retainer"
                            rows={2}
                            {...register('tags')}
                            aria-invalid={Boolean(errors.tags)}
                        />
                        <p className="text-xs text-slate-400">Separate tags with commas to group clients later.</p>
                        {errors.tags ? <FieldError message={errors.tags.message} /> : null}
                    </div>
                    {serverError ? (
                        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{serverError}</div>
                    ) : null}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            Save client
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

type ClientsTableProps = {
    clients: ClientRecord[];
    isLoading: boolean;
};

function ClientsTable({ clients, isLoading }: ClientsTableProps) {
    if (isLoading) {
        return (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-slate-800/70 bg-slate-950/80 text-sm text-slate-300">
                Loading clients…
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/80 shadow-inner">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-950/80">
                    <tr>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Email</TableHeaderCell>
                        <TableHeaderCell>Phone</TableHeaderCell>
                        <TableHeaderCell className="text-right">Outstanding</TableHeaderCell>
                        <TableHeaderCell>Upcoming shoot</TableHeaderCell>
                        <TableHeaderCell>Portal ready</TableHeaderCell>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/80">
                    {clients.map((client) => {
                        const portalReady = client.portal_enabled || Boolean(client.portal_url);
                        return (
                            <tr key={client.id} className="bg-slate-950/60 hover:bg-slate-900/60">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-white">{client.name}</span>
                                        <span className="text-xs text-slate-400">Last updated {formatDate(client.updated_at)}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={client.status} />
                                </TableCell>
                                <TableCell>{client.email ?? '—'}</TableCell>
                                <TableCell>{client.phone ?? '—'}</TableCell>
                                <TableCell className="text-right font-semibold text-white">
                                    {formatCurrency(client.outstanding_cents)}
                                </TableCell>
                                <TableCell>{formatDate(client.upcoming_shoot)}</TableCell>
                                <TableCell>
                                    {portalReady ? (
                                        <Badge variant="success">Ready</Badge>
                                    ) : (
                                        <Badge variant="neutral">Pending</Badge>
                                    )}
                                </TableCell>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

type KpiCardProps = {
    label: string;
    value: string;
    helper: string;
};

function KpiCard({ label, value, helper }: KpiCardProps) {
    return (
        <div className="flex h-28 flex-col justify-center rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/50">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">{label}</span>
            <span className="mt-3 text-3xl font-semibold leading-none text-white">{value}</span>
            <span className="mt-2 text-xs text-slate-500">{helper}</span>
        </div>
    );
}

type EmptyStateProps = {
    onAddClient: () => void;
};

function EmptyState({ onAddClient }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/80 px-10 py-16 text-center text-slate-300">
            <p className="text-lg font-semibold text-white">No clients yet</p>
            <p className="max-w-md text-sm text-slate-400">
                When you add your first client they will appear here with shoot dates, portal access, and balance tracking.
            </p>
            <Button type="button" onClick={onAddClient}>
                Add client
            </Button>
        </div>
    );
}

type ToastProps = {
    toast: ToastState | null;
};

function Toast({ toast }: ToastProps) {
    if (!toast) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
            <div
                className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg ${
                    toast.variant === 'success'
                        ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                        : 'border-rose-400/50 bg-rose-500/15 text-rose-100'
                }`}
            >
                {toast.message}
            </div>
        </div>
    );
}

type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;

type TableHeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement>;

function TableCell({ className, ...props }: TableCellProps) {
    return <td className={`px-6 py-4 text-sm text-slate-200 ${className ?? ''}`} {...props} />;
}

function TableHeaderCell({ className, ...props }: TableHeaderCellProps) {
    return (
        <th
            className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 ${className ?? ''}`}
            {...props}
        />
    );
}

type StatusBadgeProps = {
    status: ClientStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
    const variant = status === 'Active' ? 'success' : status === 'Inactive' ? 'warning' : 'neutral';
    return <Badge variant={variant}>{status}</Badge>;
}

type FieldErrorProps = {
    message?: string;
};

function FieldError({ message }: FieldErrorProps) {
    if (!message) {
        return null;
    }
    return <p className="text-xs text-rose-300">{message}</p>;
}
