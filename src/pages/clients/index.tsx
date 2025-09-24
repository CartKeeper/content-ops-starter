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
    DialogFooter,
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
    error?: string;
};

type MetricsResponse = {
    activeCount: number;
    outstandingCents: number;
    upcomingCount60d: number;
    portalReadyCount: number;
    error?: string;
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

    const {
        data: metricsData,
        error: metricsError,
        mutate: mutateMetrics
    } = useSWR<MetricsResponse>('/api/clients/metrics', fetcher);

    const clients = clientsData?.data ?? [];
    const clientsWarning = clientsError ? null : clientsData?.error;
    const metricsWarning = metricsError ? null : metricsData?.error;
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
        <div className="d-flex flex-column gap-4 pb-5">
            {metricsError ? (
                <div className="alert alert-danger" role="status">
                    {metricsError.message}
                </div>
            ) : null}

            {!metricsError && metricsWarning ? (
                <div className="alert alert-warning" role="status">
                    {metricsWarning}
                </div>
            ) : null}
            <div className="row row-cards">
                <div className="col-sm-6 col-lg-3">
                    <KpiCard
                        label="Active clients"
                        value={String(metricsData?.activeCount ?? 0)}
                        helper="Status set to Active"
                    />
                </div>
                <div className="col-sm-6 col-lg-3">
                    <KpiCard
                        label="Outstanding balance"
                        value={formatCurrency(metricsData?.outstandingCents ?? 0)}
                        helper="Across all clients"
                    />
                </div>
                <div className="col-sm-6 col-lg-3">
                    <KpiCard
                        label="Upcoming shoots"
                        value={String(metricsData?.upcomingCount60d ?? 0)}
                        helper="Next 60 days"
                    />
                </div>
                <div className="col-sm-6 col-lg-3">
                    <KpiCard
                        label="Portal ready"
                        value={String(metricsData?.portalReadyCount ?? 0)}
                        helper="Client portal enabled"
                    />
                </div>
            </div>

            <div className="card card-stacked">
                <div className="card-body d-flex flex-column gap-3">
                    <div className="row g-3 align-items-end">
                        <div className="col-md">
                            <Input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search clients by name, email, or phone"
                                aria-label="Search clients"
                            />
                        </div>
                        <div className="col-sm-6 col-md-3">
                            <Label>Status</Label>
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
                        <div className="col-sm-6 col-md-3">
                            <Label>Sort</Label>
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
                        <div className="col-12 col-md-auto ms-auto">
                            <Button type="button" onClick={() => setDialogOpen(true)}>
                                Add client
                            </Button>
                        </div>
                    </div>

                    {clientsError ? (
                        <div className="alert alert-danger" role="status">
                            {clientsError.message}
                        </div>
                    ) : null}

                    {!clientsError && clientsWarning ? (
                        <div className="alert alert-warning" role="status">
                            {clientsWarning}
                        </div>
                    ) : null}

                    {showEmptyState ? (
                        <EmptyState onAddClient={() => setDialogOpen(true)} />
                    ) : (
                        <ClientsTable clients={clients} isLoading={isLoadingClients} />
                    )}
                </div>
            </div>

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

    const previousOpenRef = React.useRef(open);

    React.useEffect(() => {
        const wasPreviouslyOpen = previousOpenRef.current;
        previousOpenRef.current = open;

        if (wasPreviouslyOpen && !open) {
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
            <DialogContent>
                <form onSubmit={onSubmit} noValidate>
                    <DialogHeader>
                        <DialogTitle>Add client</DialogTitle>
                        <DialogDescription>
                            Capture the essentials so you can schedule shoots and share portals later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="modal-body">
                        <div className="mb-3">
                            <Label htmlFor="client-name">Name</Label>
                            <Input
                                id="client-name"
                                placeholder="Client name"
                                className={errors.name ? 'is-invalid' : undefined}
                                {...register('name')}
                            />
                            <FieldError message={errors.name?.message} />
                        </div>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <Label htmlFor="client-email">Email</Label>
                                <Input
                                    id="client-email"
                                    type="email"
                                    placeholder="name@example.com"
                                    className={errors.email ? 'is-invalid' : undefined}
                                    {...register('email')}
                                />
                                <FieldError message={errors.email?.message} />
                            </div>
                            <div className="col-md-6">
                                <Label htmlFor="client-phone">Phone</Label>
                                <Input
                                    id="client-phone"
                                    placeholder="(555) 555-5555"
                                    className={errors.phone ? 'is-invalid' : undefined}
                                    {...register('phone')}
                                />
                                <FieldError message={errors.phone?.message} />
                            </div>
                        </div>
                        <div className="row g-3 mt-1">
                            <div className="col-md-6">
                                <Label htmlFor="client-status">Status</Label>
                                <Select
                                    id="client-status"
                                    className={errors.status ? 'is-invalid' : undefined}
                                    {...register('status')}
                                >
                                    {STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </Select>
                                <FieldError message={errors.status?.message} />
                            </div>
                            <div className="col-md-6">
                                <Label htmlFor="client-upcoming">Upcoming shoot</Label>
                                <Input
                                    id="client-upcoming"
                                    type="date"
                                    className={errors.upcoming_shoot ? 'is-invalid' : undefined}
                                    {...register('upcoming_shoot')}
                                />
                                <FieldError message={errors.upcoming_shoot?.message} />
                            </div>
                        </div>
                        <div className="mb-3 mt-3">
                            <Label htmlFor="client-tags">Tags</Label>
                            <Textarea
                                id="client-tags"
                                placeholder="wedding, vip, retainer"
                                rows={2}
                                className={errors.tags ? 'is-invalid' : undefined}
                                {...register('tags')}
                            />
                            <div className="form-text">Separate tags with commas to group clients later.</div>
                            <FieldError message={errors.tags?.message} />
                        </div>
                        {serverError ? (
                            <div className="alert alert-danger" role="alert">
                                {serverError}
                            </div>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            Save client
                        </Button>
                    </DialogFooter>
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
            <div className="text-center text-secondary py-5">
                <div className="spinner-border text-primary mb-2" role="status" aria-hidden />
                <div>Loading clients…</div>
            </div>
        );
    }

    return (
        <div className="table-responsive">
            <table className="table card-table table-vcenter">
                <thead>
                    <tr>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Email</TableHeaderCell>
                        <TableHeaderCell>Phone</TableHeaderCell>
                        <TableHeaderCell className="text-end">Outstanding</TableHeaderCell>
                        <TableHeaderCell>Upcoming shoot</TableHeaderCell>
                        <TableHeaderCell>Portal ready</TableHeaderCell>
                    </tr>
                </thead>
                <tbody>
                    {clients.map((client) => {
                        const portalReady = client.portal_enabled || Boolean(client.portal_url);
                        return (
                            <tr key={client.id}>
                                <TableCell>
                                    <div className="d-flex flex-column">
                                        <span className="fw-semibold">{client.name}</span>
                                        <span className="text-secondary small">Last updated {formatDate(client.updated_at)}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={client.status} />
                                </TableCell>
                                <TableCell>{client.email ?? '—'}</TableCell>
                                <TableCell>{client.phone ?? '—'}</TableCell>
                                <TableCell className="text-end fw-semibold">
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
        <div className="card card-stacked h-100">
            <div className="card-body">
                <div className="text-uppercase text-secondary small fw-semibold">{label}</div>
                <div className="h2 mt-2 mb-2">{value}</div>
                <div className="text-secondary small">{helper}</div>
            </div>
        </div>
    );
}

type EmptyStateProps = {
    onAddClient: () => void;
};

function EmptyState({ onAddClient }: EmptyStateProps) {
    return (
        <div className="card card-stacked">
            <div className="card-body text-center">
                <p className="h4">No clients yet</p>
                <p className="text-secondary">
                    When you add your first client they will appear here with shoot dates, portal access, and balance tracking.
                </p>
                <div className="mt-3">
                    <Button type="button" onClick={onAddClient}>
                        Add client
                    </Button>
                </div>
            </div>
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
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
            <div className={`toast show text-white ${toast.variant === 'success' ? 'bg-success' : 'bg-danger'}`} role="status">
                <div className="toast-body">{toast.message}</div>
            </div>
        </div>
    );
}

type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;

type TableHeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement>;

function TableCell({ className, ...props }: TableCellProps) {
    return <td className={`align-middle ${className ?? ''}`} {...props} />;
}

function TableHeaderCell({ className, ...props }: TableHeaderCellProps) {
    return (
        <th className={`text-uppercase text-secondary small fw-semibold ${className ?? ''}`} {...props} />
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
    return (
        <div className="invalid-feedback d-block" role="alert">
            {message}
        </div>
    );
}
