import * as React from 'react';
import Head from 'next/head';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef, PaginationState, RowSelectionState, SortingState } from '@tanstack/react-table';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '../../components/ui/dialog';
import { CrmAuthGuard, WorkspaceLayout } from '../../components/crm';
import DataToolbar, { type SortOption, type ToolbarFilter } from '../../components/data/DataToolbar';
import DataTable from '../../components/data/DataTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { LayoutShell, PageHeader } from '../../components/dashboard';
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
    { id: 'updated-asc', label: 'Least recently updated', state: [{ id: 'updatedAt', desc: false }] }
];

const DEFAULT_CONTACT_SORT = CONTACT_SORT_OPTIONS[0];

const STAGE_FILTER_OPTIONS: ToolbarFilter['options'] = [
    { value: 'new', label: 'New' },
    { value: 'warm', label: 'Warm' },
    { value: 'hot', label: 'Hot' }
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
                    <title>Contacts · Aperture Studio CRM</title>
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
        mutate: mutateContacts
    } = useSWR<ContactsApiResponse>(queryKey, fetcher, {
        keepPreviousData: true,
        revalidateOnFocus: false
    });

    React.useEffect(() => {
        const match = CONTACT_SORT_OPTIONS.find((option) => option.id === sortValue);
        setSorting(match?.state ?? DEFAULT_CONTACT_SORT.state);
    }, [sortValue]);

    const ownerLabelMap = React.useMemo(() => {
        const map = new Map<string, string | null>();
        const owners = contactsResponse?.meta.availableFilters.owners ?? [];
        owners.forEach((owner) => {
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
                updatedAt: record.updated_at ?? null
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

    const columns = React.useMemo<ColumnDef<ContactTableRow>[]>(() => [
        {
            accessorKey: 'name',
            header: 'Contact',
            cell: ({ row }) => (
                <div className="d-flex flex-column">
                    <span className="fw-semibold">{row.original.name}</span>
                    <span className="text-secondary small">
                        {row.original.email ?? 'No email'} • {row.original.phone ?? 'No phone'}
                    </span>
                </div>
            ),
            enableSorting: true
        },
        {
            accessorKey: 'stage',
            header: 'Stage',
            cell: ({ row }) => (
                <span className={`badge text-uppercase fw-semibold ${getStageBadge(row.original.stage)}`}>
                    {row.original.stage.toUpperCase()}
                </span>
            ),
            enableSorting: false
        },
        {
            accessorKey: 'owner',
            header: 'Owner',
            cell: ({ row }) => <span className="text-secondary">{row.original.owner ?? 'Unassigned'}</span>,
            enableSorting: false
        },
        {
            accessorKey: 'createdAt',
            header: 'Created',
            cell: ({ row }) => <span className="text-secondary">{row.original.createdAt ? formatDate(row.original.createdAt) : '—'}</span>,
            enableSorting: true
        },
        {
            accessorKey: 'updatedAt',
            header: 'Updated',
            cell: ({ row }) => <span className="text-secondary">{row.original.updatedAt ? formatDate(row.original.updatedAt) : '—'}</span>,
            enableSorting: true
        }
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

    const hasFilterChips = stageFilter.length > 0 || statusFilter.length > 0 || ownerFilter.length > 0;
    const hasSearch = search.trim().length > 0;
    const hasAnyFilters = hasFilterChips || hasSearch;

    const addNotification = React.useCallback((title: string, tone: ToastMessage['tone'], description?: string) => {
        setNotifications((previous) => [
            ...previous,
            { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title, tone, description }
        ]);
    }, []);

    const handleSortingChange = React.useCallback(
        (updater: SortingState | ((old: SortingState) => SortingState)) => {
            setSorting((previous) => {
                const nextState = typeof updater === 'function' ? updater(previous) : updater;
                const match = CONTACT_SORT_OPTIONS.find(
                    (option) =>
                        option.state.length === nextState.length &&
                        option.state.every((entry, index) => entry.id === nextState[index]?.id && entry.desc === nextState[index]?.desc)
                );
                setSortValue(match?.id ?? DEFAULT_CONTACT_SORT.id);
                return nextState;
            });
        },
        []
    );

    const emptyMessage = React.useMemo(() => {
        const totalKnown = contactsResponse?.meta.total ?? 0;
        const workspaceEmpty = totalKnown === 0;
        if (workspaceEmpty) {
            return (
                <div className="text-center">
                    <p className="fw-semibold mb-1">No contacts yet</p>
                    <p className="text-secondary">Start building your network.</p>
                    <div className="mt-3">
                        <Button type="button" onClick={() => setIsDialogOpen(true)}>
                            Add contact
                        </Button>
                    </div>
                </div>
            );
        }

        if (hasAnyFilters) {
            return <p className="mb-0">No contacts match your search or filters.</p>;
        }

        return <p className="mb-0">No contacts found.</p>;
    }, [contactsResponse?.meta.total, hasAnyFilters]);

    const handleContactCreated = React.useCallback(
        async (record: ContactRecord) => {
            addNotification('Contact added', 'success', getContactName(record));
            setPagination((previous) => ({ ...previous, pageIndex: 0 }));
            setRowSelection({});
            await mutateContacts();
        },
        [addNotification, mutateContacts]
    );

    const handleContactError = React.useCallback(
        (message: string) => {
            addNotification('Unable to add contact', 'error', message);
        },
        [addNotification]
    );

    const handleResetFilters = React.useCallback(() => {
        setStageFilter([]);
        setStatusFilter([]);
        setOwnerFilter([]);
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    }, []);

    const handleSearchChange = React.useCallback((value: string) => {
        setSearch(value);
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    }, []);

    const handleStageFilterChange = React.useCallback((value: string[]) => {
        setStageFilter(value);
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    }, []);

    const handleStatusFilterChange = React.useCallback((value: string[]) => {
        setStatusFilter(value);
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    }, []);

    const handleOwnerFilterChange = React.useCallback((value: string[]) => {
        setOwnerFilter(value);
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    }, []);

    const filters = React.useMemo<ToolbarFilter[]>(() => {
        const entries: ToolbarFilter[] = [
            { id: 'stage', label: 'Stage', options: STAGE_FILTER_OPTIONS, value: stageFilter, onChange: handleStageFilterChange }
        ];

        if (statusOptions.length > 0) {
            entries.push({ id: 'status', label: 'Status', options: statusOptions, value: statusFilter, onChange: handleStatusFilterChange });
        }

        if (ownerOptions.length > 0) {
            entries.push({ id: 'owner', label: 'Owner', options: ownerOptions, value: ownerFilter, onChange: handleOwnerFilterChange });
        }

        return entries;
    }, [handleOwnerFilterChange, handleStageFilterChange, handleStatusFilterChange, ownerOptions, stageFilter, statusFilter, statusOptions]);

    return (
        <LayoutShell>
            <PageHeader title="Contacts" description="Manage your studio’s contact list.">
                <Button type="button" onClick={() => setIsDialogOpen(true)}>
                    Add contact
                </Button>
            </PageHeader>

            <DataToolbar
                searchValue={search}
                onSearchChange={handleSearchChange}
                searchPlaceholder="Search contacts"
                filters={filters}
                onResetFilters={handleResetFilters}
                hasActiveFilters={hasFilterChips}
                sortOptions={CONTACT_SORT_OPTIONS.map(({ id, label }) => ({ id, label }))}
                sortValue={sortValue}
                onSortChange={setSortValue}
                selectedCount={Object.keys(rowSelection).length}
                pageSize={pagination.pageSize}
                onPageSizeChange={(value) => setPagination({ pageIndex: 0, pageSize: value })}
            />

            {contactsError ? (
                <div className="alert alert-danger mt-3" role="alert">
                    {contactsError.message}
                </div>
            ) : null}

            {notifications.length > 0 ? (
                <div className="mt-3 d-flex flex-column gap-2" aria-live="polite">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`alert mb-0 ${notification.tone === 'success' ? 'alert-success' : 'alert-danger'}`}
                            role="alert"
                        >
                            <div className="fw-semibold">{notification.title}</div>
                            {notification.description ? (
                                <div className="text-secondary small mt-1">{notification.description}</div>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}

            <div className="mt-3">
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
            </div>

            <AddContactDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={handleContactCreated}
                onError={handleContactError}
            />
        </LayoutShell>
    );
}

const STAGE_BADGE_VARIANTS: Record<ContactStage, string> = {
    hot: 'bg-danger-lt text-danger',
    warm: 'bg-warning-lt text-warning',
    new: 'bg-primary-lt text-primary'
};

function getStageBadge(stage: ContactStage): string {
    return STAGE_BADGE_VARIANTS[stage] ?? STAGE_BADGE_VARIANTS.new;
}

const optionalTextField = z.preprocess(
    (value) => {
        if (typeof value !== 'string') {
            return undefined;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().optional()
);

const emailField = optionalTextField.refine(
    (value) => !value || z.string().email().safeParse(value).success,
    'Enter a valid email'
);

const addContactSchema = z
    .object({
        first_name: optionalTextField,
        last_name: optionalTextField,
        email: emailField,
        phone: optionalTextField,
        address: optionalTextField,
        city: optionalTextField,
        state: optionalTextField,
        business: optionalTextField,
        notes: optionalTextField
    })
    .superRefine((data, context) => {
        if (!data.first_name && !data.last_name && !data.business && !data.email) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['first_name'],
                message: 'Provide at least a first name, last name, business, or email'
            });
        }
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
        formState: { errors }
    } = useForm<AddContactFormValues>({
        resolver: zodResolver(addContactSchema),
        defaultValues: {
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            business: '',
            notes: ''
        }
    });

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const firstNameInputRef = React.useRef<HTMLInputElement | null>(null);

    const firstNameField = register('first_name');
    const lastNameField = register('last_name');
    const emailField = register('email');
    const phoneField = register('phone');
    const addressField = register('address');
    const cityField = register('city');
    const stateField = register('state');
    const businessField = register('business');
    const notesField = register('notes');

    React.useEffect(() => {
        if (!open) {
            reset({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                state: '',
                business: '',
                notes: ''
            });
        }
    }, [open, reset]);

    const onSubmit = handleSubmit(async (values) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: values.first_name,
                    last_name: values.last_name,
                    email: values.email,
                    phone: values.phone,
                    address: values.address,
                    city: values.city,
                    state: values.state,
                    business: values.business,
                    notes: values.notes
                })
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
        <Dialog open={open} onOpenChange={(next) => (!isSubmitting ? onOpenChange(next) : undefined)}>
            <DialogContent
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    if (typeof window !== 'undefined') {
                        window.requestAnimationFrame(() => firstNameInputRef.current?.focus());
                    }
                }}
            >
                <form onSubmit={onSubmit} noValidate>
                    <DialogHeader>
                        <DialogTitle>Add contact</DialogTitle>
                        <DialogDescription>Capture a new lead without leaving the table.</DialogDescription>
                    </DialogHeader>
                    <div className="modal-body">
                        <div className="row g-3">
                            <div className="col-md-6">
                                <Label htmlFor="contact-first-name">First name</Label>
                                <Input
                                    id="contact-first-name"
                                    placeholder="Jamie"
                                    className={errors.first_name ? 'is-invalid' : undefined}
                                    {...firstNameField}
                                    ref={(element) => {
                                        firstNameField.ref(element);
                                        firstNameInputRef.current = element;
                                    }}
                                    disabled={isSubmitting}
                                />
                                <FieldError message={errors.first_name?.message} />
                            </div>
                            <div className="col-md-6">
                                <Label htmlFor="contact-last-name">Last name</Label>
                                <Input
                                    id="contact-last-name"
                                    placeholder="Rivera"
                                    className={errors.last_name ? 'is-invalid' : undefined}
                                    {...lastNameField}
                                    disabled={isSubmitting}
                                />
                                <FieldError message={errors.last_name?.message} />
                            </div>
                            <div className="col-12">
                                <Label htmlFor="contact-business">Business</Label>
                                <Input
                                    id="contact-business"
                                    placeholder="Aperture Studio"
                                    className={errors.business ? 'is-invalid' : undefined}
                                    {...businessField}
                                    disabled={isSubmitting}
                                />
                                <FieldError message={errors.business?.message} />
                            </div>
                            <div className="col-md-6">
                                <Label htmlFor="contact-email">Email</Label>
                                <Input
                                    id="contact-email"
                                    type="email"
                                    placeholder="jamie@example.com"
                                    className={errors.email ? 'is-invalid' : undefined}
                                    {...emailField}
                                    disabled={isSubmitting}
                                />
                                <FieldError message={errors.email?.message} />
                            </div>
                            <div className="col-md-6">
                                <Label htmlFor="contact-phone">Phone</Label>
                                <Input
                                    id="contact-phone"
                                    type="tel"
                                    placeholder="(555) 010-1234"
                                    className={errors.phone ? 'is-invalid' : undefined}
                                    {...phoneField}
                                    disabled={isSubmitting}
                                />
                                <FieldError message={errors.phone?.message} />
                            </div>
                            <div className="col-12">
                                <Label htmlFor="contact-address">Address</Label>
                                <Input
                                    id="contact-address"
                                    placeholder="872 Market Street"
                                    className={errors.address ? 'is-invalid' : undefined}
                                    {...addressField}
                                    disabled={isSubmitting}
                                />
                                <FieldError message={errors.address?.message} />
                            </div>
                            <div className="col-md-8">
                                <Label htmlFor="contact-city">City</Label>
                                <Input
                                    id="contact-city"
                                    placeholder="San Francisco"
                                    className={errors.city ? 'is-invalid' : undefined}
                                    {...cityField}
                                    disabled={isSubmitting}
                                />
                                <FieldError message={errors.city?.message} />
                            </div>
                            <div className="col-md-4">
                                <Label htmlFor="contact-state">State</Label>
                                <Input
                                    id="contact-state"
                                    placeholder="CA"
                                    className={errors.state ? 'is-invalid' : undefined}
                                    {...stateField}
                                    disabled={isSubmitting}
                                />
                                <FieldError message={errors.state?.message} />
                            </div>
                            <div className="col-12">
                                <Label htmlFor="contact-notes">Notes</Label>
                                <Textarea
                                    id="contact-notes"
                                    placeholder="Add context or follow-up details"
                                    className={errors.notes ? 'is-invalid' : undefined}
                                    rows={3}
                                    {...notesField}
                                    disabled={isSubmitting}
                                />
                                <FieldError message={errors.notes?.message} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                            Save contact
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

type FieldErrorProps = { message?: string };

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
