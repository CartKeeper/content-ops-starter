import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import type { ColumnDef, OnChangeFn, PaginationState, RowSelectionState, SortingState } from '@tanstack/react-table';
import { CrmAuthGuard, WorkspaceLayout } from '../../components/crm';
import DataToolbar, { type SortOption, type ToolbarFilter } from '../../components/data/DataToolbar';
import DataTable from '../../components/data/DataTable';
import { LayoutShell, PageHeader } from '../../components/dashboard';
import { formatDate } from '../../lib/formatters';
import type { ContactRecord } from '../../types/contact';
import { getContactName } from '../../types/contact';
import { deriveStage, type ContactStage } from '../../lib/contacts';
import { isSamePagination, isSameSorting, isSameRowSelection } from '@/utils/tableEquality';
import ContactFormModal from '../../components/contacts/ContactFormModal';

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
    const router = useRouter();
    const contactIdQuery = router.query?.contactId;
    const contactIdParam = Array.isArray(contactIdQuery) ? contactIdQuery[0] ?? null : contactIdQuery ?? null;
    const isCreatingContact = contactIdParam === 'new';
    const activeContactId = !isCreatingContact && typeof contactIdParam === 'string' ? contactIdParam : null;
    const isContactModalOpen = contactIdParam != null;

    const [search, setSearch] = React.useState('');
    const [stageFilter, setStageFilter] = React.useState<string[]>([]);
    const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
    const [ownerFilter, setOwnerFilter] = React.useState<string[]>([]);
    const [sortValue, setSortValue] = React.useState<string>(DEFAULT_CONTACT_SORT.id);
    const [sorting, setSorting] = React.useState<SortingState>(DEFAULT_CONTACT_SORT.state);
    const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
    const [notifications, setNotifications] = React.useState<ToastMessage[]>([]);

    const handleSortingChange = React.useCallback<OnChangeFn<SortingState>>((updater) => {
        setSorting((previous) => {
            const nextState = typeof updater === 'function' ? updater(previous) : updater;
            if (isSameSorting(previous, nextState)) {
                return previous;
            }

            const match = CONTACT_SORT_OPTIONS.find(
                (option) =>
                    option.state.length === nextState.length &&
                    option.state.every((entry, index) => entry.id === nextState[index]?.id && entry.desc === nextState[index]?.desc)
            );
            setSortValue(match?.id ?? DEFAULT_CONTACT_SORT.id);

            return nextState;
        });
    }, []);

    const handlePaginationChange = React.useCallback<OnChangeFn<PaginationState>>((updater) => {
        setPagination((previous) => {
            const nextState = typeof updater === 'function' ? updater(previous) : updater;
            return isSamePagination(previous, nextState) ? previous : nextState;
        });
    }, []);

    const handleRowSelectionChange = React.useCallback<OnChangeFn<RowSelectionState>>((updater) => {
        setRowSelection((previous) => {
            const nextState = typeof updater === 'function' ? updater(previous) : updater;
            return isSameRowSelection(previous, nextState) ? previous : nextState;
        });
    }, []);

    const openContactModal = React.useCallback(
        (targetId: string) => {
            const nextQuery = { ...router.query, contactId: targetId } as Record<string, any>;
            router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
        },
        [router]
    );

    const closeContactModal = React.useCallback(() => {
        const { contactId, ...rest } = router.query;
        router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }, [router]);

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
        const nextState = match?.state ?? DEFAULT_CONTACT_SORT.state;
        setSorting((previous) => (isSameSorting(previous, nextState) ? previous : nextState));
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

    const pageCountRef = React.useRef<number | null>(null);
    React.useEffect(() => {
        if (typeof pageCount !== 'number') {
            return;
        }
        if (pageCount === pageCountRef.current) {
            return;
        }
        pageCountRef.current = pageCount;

        setPagination((previous) => {
            const maxIndex = Math.max(0, pageCount - 1);
            if (previous.pageIndex <= maxIndex) {
                return previous;
            }
            const nextState = { ...previous, pageIndex: maxIndex };
            return isSamePagination(previous, nextState) ? previous : nextState;
        });
    }, [pageCount]);

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

    const handleAddContactClick = React.useCallback(() => {
        openContactModal('new');
    }, [openContactModal]);

    const handleRowClick = React.useCallback(
        (row: ContactTableRow) => {
            openContactModal(row.id);
        },
        [openContactModal]
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
                        <button type="button" className="btn btn-primary" onClick={handleAddContactClick}>
                            Add contact
                        </button>
                    </div>
                </div>
            );
        }

        if (hasAnyFilters) {
            return <p className="mb-0">No contacts match your search or filters.</p>;
        }

        return <p className="mb-0">No contacts found.</p>;
    }, [contactsResponse?.meta.total, handleAddContactClick, hasAnyFilters]);

    const handleContactSaved = React.useCallback(
        async (record: ContactRecord, mode: 'create' | 'update') => {
            addNotification(mode === 'create' ? 'Contact added' : 'Contact updated', 'success', getContactName(record));
            if (mode === 'create') {
                handlePaginationChange((previous) => ({ ...previous, pageIndex: 0 }));
            }
            handleRowSelectionChange({});
            await mutateContacts();
        },
        [addNotification, handlePaginationChange, handleRowSelectionChange, mutateContacts]
    );

    const handleContactError = React.useCallback(
        (message: string) => {
            addNotification('Unable to save contact', 'error', message);
        },
        [addNotification]
    );

    const handleResetFilters = React.useCallback(() => {
        setStageFilter([]);
        setStatusFilter([]);
        setOwnerFilter([]);
        handlePaginationChange((previous) => ({ ...previous, pageIndex: 0 }));
    }, [handlePaginationChange]);

    const handleSearchChange = React.useCallback(
        (value: string) => {
            setSearch(value);
            handlePaginationChange((previous) => ({ ...previous, pageIndex: 0 }));
        },
        [handlePaginationChange]
    );

    const handleStageFilterChange = React.useCallback(
        (value: string[]) => {
            setStageFilter(value);
            handlePaginationChange((previous) => ({ ...previous, pageIndex: 0 }));
        },
        [handlePaginationChange]
    );

    const handleStatusFilterChange = React.useCallback(
        (value: string[]) => {
            setStatusFilter(value);
            handlePaginationChange((previous) => ({ ...previous, pageIndex: 0 }));
        },
        [handlePaginationChange]
    );

    const handleOwnerFilterChange = React.useCallback(
        (value: string[]) => {
            setOwnerFilter(value);
            handlePaginationChange((previous) => ({ ...previous, pageIndex: 0 }));
        },
        [handlePaginationChange]
    );

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
                <button type="button" className="btn btn-primary" onClick={handleAddContactClick}>
                    Add contact
                </button>
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
                onPageSizeChange={(value) => handlePaginationChange({ pageIndex: 0, pageSize: value })}
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
                    onPaginationChange={handlePaginationChange}
                    rowSelection={rowSelection}
                    onRowSelectionChange={handleRowSelectionChange}
                    manualPagination
                    manualSorting
                    pageCount={pageCount}
                    getRowId={(row) => row.id}
                    onRowClick={handleRowClick}
                    isLoading={isContactsLoading && !contactsResponse}
                    emptyMessage={emptyMessage}
                />
            </div>

            <ContactFormModal
                open={isContactModalOpen}
                contactId={isCreatingContact ? null : activeContactId}
                onClose={closeContactModal}
                onSaved={handleContactSaved}
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
