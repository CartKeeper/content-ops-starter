import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ColumnDef, PaginationState, RowSelectionState, SortingState } from '@tanstack/react-table';

import { CrmAuthGuard, WorkspaceLayout } from '../../components/crm';
import DataToolbar, { type ToolbarFilter, type SortOption } from '../../components/data/DataToolbar';
import DataTable from '../../components/data/DataTable';
import ContactDrawer, { type ContactProfile } from '../../components/contacts/ContactDrawer';
import {
    buildContactDashboardData,
    convertContactToClient,
    fetchContacts,
    mapContactToRow,
    type ContactTableRow
} from '../../lib/api/contacts';
import type { ContactRecord } from '../../types/contact';
import { formatDate } from '../../lib/formatters';

type QueryState = {
    q?: string;
    stage?: string;
    tags?: string;
    owner?: string;
    status?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
};

const CONTACT_SORT_OPTIONS: Array<SortOption & { state: SortingState }> = [
    { id: 'name-asc', label: 'Name (A-Z)', state: [{ id: 'name', desc: false }] },
    { id: 'interaction-desc', label: 'Last interaction (newest)', state: [{ id: 'lastInteractionAt', desc: true }] },
    { id: 'interaction-asc', label: 'Last interaction (oldest)', state: [{ id: 'lastInteractionAt', desc: false }] }
];

const DEFAULT_CONTACT_SORT = CONTACT_SORT_OPTIONS[0];

type NotificationBanner = { id: string; message: string; tone: 'success' | 'error' };

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
    const router = useRouter();
    const parseList = React.useCallback((value: string | string[] | undefined) => {
        if (Array.isArray(value)) {
            return value.flatMap((entry) => entry.split(',')).filter(Boolean);
        }
        if (typeof value === 'string') {
            return value.split(',').map((entry) => entry.trim()).filter(Boolean);
        }
        return [];
    }, []);

    const initialSearch = typeof router.query.q === 'string' ? router.query.q : '';
    const initialStage = parseList(router.query.stage);
    const initialTags = parseList(router.query.tags);
    const initialOwner = parseList(router.query.owner);
    const initialStatus = parseList(router.query.status);
    const initialSortId = typeof router.query.sort === 'string' ? router.query.sort : DEFAULT_CONTACT_SORT.id;
    const initialSortOption = CONTACT_SORT_OPTIONS.find((option) => option.id === initialSortId) ?? DEFAULT_CONTACT_SORT;
    const initialPageIndex = (() => {
        const value = typeof router.query.page === 'string' ? Number.parseInt(router.query.page, 10) : 1;
        return Number.isFinite(value) && value > 0 ? value - 1 : 0;
    })();
    const initialPageSize = (() => {
        const value = typeof router.query.pageSize === 'string' ? Number.parseInt(router.query.pageSize, 10) : 10;
        return Number.isFinite(value) && value > 0 ? value : 10;
    })();

    const [records, setRecords] = React.useState<ContactRecord[]>([]);
    const [rows, setRows] = React.useState<ContactTableRow[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [notifications, setNotifications] = React.useState<NotificationBanner[]>([]);
    const [search, setSearch] = React.useState<string>(initialSearch);
    const [stageFilter, setStageFilter] = React.useState<string[]>(initialStage);
    const [tagFilter, setTagFilter] = React.useState<string[]>(initialTags);
    const [ownerFilter, setOwnerFilter] = React.useState<string[]>(initialOwner);
    const [statusFilter, setStatusFilter] = React.useState<string[]>(initialStatus);
    const [sortValue, setSortValue] = React.useState<string>(initialSortOption.id);
    const [sorting, setSorting] = React.useState<SortingState>(initialSortOption.state);
    const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: initialPageIndex, pageSize: initialPageSize });
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
    const [drawerContactId, setDrawerContactId] = React.useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);
    const [conversionTarget, setConversionTarget] = React.useState<string | null>(null);

    const metrics = React.useMemo(() => buildContactDashboardData(records), [records]);

    const contactProfiles = React.useMemo(() => {
        const map = new Map<string, ContactProfile>();
        rows.forEach((row) => {
            const record = records.find((entry) => entry.id === row.id);
            if (record) {
                map.set(row.id, { ...row, record });
            }
        });
        return map;
    }, [records, rows]);

    const selectedProfile = drawerContactId ? contactProfiles.get(drawerContactId) ?? null : null;

    React.useEffect(() => {
        let active = true;
        async function loadContacts() {
            setIsLoading(true);
            setError(null);
            try {
                const data = await fetchContacts();
                if (!active) return;
                setRecords(data);
                setRows(data.map(mapContactToRow));
            } catch (err) {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Unable to load contacts');
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }
        void loadContacts();
        return () => {
            active = false;
        };
    }, []);

    React.useEffect(() => {
        setRows(records.map(mapContactToRow));
    }, [records]);

    const tagOptions = React.useMemo(() => {
        const tags = new Set<string>();
        rows.forEach((row) => row.tags.forEach((tag) => tags.add(tag)));
        return Array.from(tags).sort();
    }, [rows]);

    const ownerOptions = React.useMemo(() => {
        const owners = new Set<string>();
        rows.forEach((row) => {
            if (row.owner) {
                owners.add(row.owner);
            }
        });
        return Array.from(owners).sort();
    }, [rows]);

    const filters = React.useMemo<ToolbarFilter[]>(() => {
        const stageOptions = [
            { value: 'new', label: 'New lead' },
            { value: 'warm', label: 'Warm lead' },
            { value: 'hot', label: 'Converted' }
        ];
        const statusOptions = [
            { value: 'lead', label: 'Lead' },
            { value: 'active', label: 'Engaged' },
            { value: 'client', label: 'Client' }
        ];
        return [
            { id: 'stage', label: 'Stage', options: stageOptions, value: stageFilter, onChange: setStageFilter },
            { id: 'tags', label: 'Tags', options: tagOptions.map((tag) => ({ value: tag, label: tag })), value: tagFilter, onChange: setTagFilter },
            { id: 'owner', label: 'Owner', options: ownerOptions.map((owner) => ({ value: owner, label: owner })), value: ownerFilter, onChange: setOwnerFilter },
            { id: 'status', label: 'Status', options: statusOptions, value: statusFilter, onChange: setStatusFilter }
        ];
    }, [ownerFilter, ownerOptions, setOwnerFilter, setStageFilter, setStatusFilter, setTagFilter, stageFilter, statusFilter, tagFilter, tagOptions]);

    const filteredRows = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return rows.filter((row) => {
            if (normalizedSearch) {
                const haystack = [row.name, row.email ?? '', row.phone ?? '', row.business ?? '', row.owner ?? '']
                    .map((value) => value.toLowerCase())
                    .some((value) => value.includes(normalizedSearch));
                if (!haystack) {
                    return false;
                }
            }

            if (stageFilter.length > 0 && !stageFilter.includes(row.stage)) {
                return false;
            }

            if (tagFilter.length > 0 && !row.tags.some((tag) => tagFilter.includes(tag))) {
                return false;
            }

            if (ownerFilter.length > 0 && (!row.owner || !ownerFilter.includes(row.owner))) {
                return false;
            }

            if (statusFilter.length > 0 && !statusFilter.includes(row.status)) {
                return false;
            }

            return true;
        });
    }, [ownerFilter, rows, search, stageFilter, statusFilter, tagFilter]);

    React.useEffect(() => {
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
        setRowSelection({});
    }, [filteredRows.length, search, stageFilter, tagFilter, ownerFilter, statusFilter]);

    const columns = React.useMemo<ColumnDef<ContactTableRow>[]>(() => {
        const stageOrder: Record<ContactTableRow['stage'], number> = { new: 0, warm: 1, hot: 2 };
        return [
            {
                id: 'select',
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        aria-label="Select contacts"
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Select ${row.original.name}`}
                    />
                ),
                enableSorting: false,
                size: 48
            },
            {
                accessorKey: 'name',
                header: 'Contact',
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-semibold text-white">{row.original.name}</span>
                        <span className="text-xs text-slate-400">{row.original.email ?? 'No email'} • {row.original.phone ?? '—'}</span>
                    </div>
                )
            },
            {
                accessorKey: 'stage',
                header: 'Stage',
                cell: ({ row }) => (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStageBadge(row.original.stage)}`}>
                        {row.original.stage.toUpperCase()}
                    </span>
                ),
                sortingFn: (a, b) => stageOrder[a.original.stage] - stageOrder[b.original.stage]
            },
            {
                accessorKey: 'lastInteractionAt',
                header: 'Last interaction',
                cell: ({ row }) => (
                    <span className="text-sm text-slate-300">
                        {row.original.lastInteractionAt ? formatDate(row.original.lastInteractionAt) : '—'}
                    </span>
                )
            },
            {
                accessorKey: 'owner',
                header: 'Owner',
                cell: ({ row }) => <span className="text-sm text-slate-300">{row.original.owner ?? 'Unassigned'}</span>
            },
            {
                id: 'actions',
                header: 'Actions',
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setDrawerContactId(row.original.id);
                                setIsDrawerOpen(true);
                            }}
                            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
                        >
                            View
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setDrawerContactId(row.original.id);
                                setIsDrawerOpen(true);
                            }}
                            className="rounded-full border border-emerald-500/50 px-3 py-1 text-xs font-medium text-emerald-200 transition hover:border-emerald-400 hover:text-white"
                        >
                            Convert
                        </button>
                    </div>
                )
            }
        ];
    }, []);

    const selectedCount = Object.keys(rowSelection).length;

    const hasActiveFilters =
        stageFilter.length > 0 || tagFilter.length > 0 || ownerFilter.length > 0 || statusFilter.length > 0;

    const resetFilters = () => {
        setStageFilter([]);
        setTagFilter([]);
        setOwnerFilter([]);
        setStatusFilter([]);
    };

    const addNotification = React.useCallback((message: string, tone: NotificationBanner['tone']) => {
        setNotifications((previous) => [...previous, { id: `${Date.now()}`, message, tone }]);
    }, []);

    React.useEffect(() => {
        if (notifications.length === 0) {
            return;
        }
        const timer = window.setTimeout(() => {
            setNotifications((previous) => previous.slice(1));
        }, 4000);
        return () => window.clearTimeout(timer);
    }, [notifications]);

    const queryState: QueryState = React.useMemo(() => {
        const state: QueryState = {};
        if (search.trim()) state.q = search.trim();
        if (stageFilter.length > 0) state.stage = stageFilter.join(',');
        if (tagFilter.length > 0) state.tags = tagFilter.join(',');
        if (ownerFilter.length > 0) state.owner = ownerFilter.join(',');
        if (statusFilter.length > 0) state.status = statusFilter.join(',');
        if (sortValue !== DEFAULT_CONTACT_SORT.id) state.sort = sortValue;
        if (pagination.pageIndex > 0) state.page = String(pagination.pageIndex + 1);
        if (pagination.pageSize !== 10) state.pageSize = String(pagination.pageSize);
        return state;
    }, [ownerFilter, pagination.pageIndex, pagination.pageSize, search, sortValue, stageFilter, statusFilter, tagFilter]);

    React.useEffect(() => {
        if (!router.isReady) {
            return;
        }
        const current: Record<string, string> = {};
        Object.entries(router.query).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                current[key] = value.join(',');
            } else if (typeof value === 'string') {
                current[key] = value;
            }
        });
        const nextEntries = Object.entries(queryState);
        const isEqual =
            nextEntries.length === Object.keys(current).length &&
            nextEntries.every(([key, value]) => current[key] === value);
        if (!isEqual) {
            void router.replace({ pathname: router.pathname, query: queryState }, undefined, { shallow: true });
        }
    }, [queryState, router]);

    React.useEffect(() => {
        const option = CONTACT_SORT_OPTIONS.find((entry) => entry.id === sortValue);
        if (option) {
            setSorting(option.state);
        }
    }, [sortValue]);

    const handleSortingChange = React.useCallback((updater: SortingState | ((old: SortingState) => SortingState)) => {
        setSorting((previous) => {
            const next = typeof updater === 'function' ? updater(previous) : updater;
            if (next.length > 0) {
                const candidate = CONTACT_SORT_OPTIONS.find(
                    (option) => option.state.length === next.length && option.state.every((entry, index) => entry.id === next[index]?.id && entry.desc === next[index]?.desc)
                );
                if (candidate) {
                    setSortValue(candidate.id);
                }
            }
            return next;
        });
    }, []);

    const handleConvertContact = React.useCallback(
        async (profile: ContactProfile) => {
            setConversionTarget(profile.id);
            try {
                await convertContactToClient(profile.id);
                addNotification(`${profile.name} converted to a client.`, 'success');
                setRecords((previous) =>
                    previous.map((record) =>
                        record.id === profile.id
                            ? {
                                  ...record,
                                  status: 'client',
                                  updated_at: new Date().toISOString()
                              }
                            : record
                    )
                );
            } catch (err) {
                addNotification(err instanceof Error ? err.message : 'Unable to convert contact', 'error');
            } finally {
                setConversionTarget(null);
            }
        },
        [addNotification]
    );

    return (
        <div className="flex flex-col gap-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Total contacts" value={metrics.total.toString()} helper="Across your workspace" />
                <KpiCard label="New this month" value={metrics.newThisMonth.toString()} helper="Captured in the last 30 days" />
                <KpiCard label="Converted to client" value={metrics.converted.toString()} helper="Marked as clients" />
                <KpiCard label="Needs follow-up" value={metrics.needsFollowUp.toString()} helper="No recent touchpoint" />
            </section>

            {error ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
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
                    {notification.message}
                </div>
            ))}

            <DataToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search contacts by name, email, phone, owner…"
                filters={filters}
                hasActiveFilters={hasActiveFilters}
                onResetFilters={resetFilters}
                sortOptions={CONTACT_SORT_OPTIONS.map(({ id, label }) => ({ id, label }))}
                sortValue={sortValue}
                onSortChange={setSortValue}
                primaryAction={{ label: 'Add contact', href: '/contacts/new' }}
                selectedCount={selectedCount}
                bulkActions={
                    <button
                        type="button"
                        disabled={selectedCount === 0}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition enabled:hover:border-indigo-400 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Bulk actions
                    </button>
                }
                pageSize={pagination.pageSize}
                onPageSizeChange={(value) => setPagination({ pageIndex: 0, pageSize: value })}
            />

            <DataTable<ContactTableRow>
                columns={columns}
                data={filteredRows}
                sorting={sorting}
                onSortingChange={handleSortingChange}
                pagination={pagination}
                onPaginationChange={setPagination}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                getRowId={(row) => row.id}
                onRowClick={(row) => {
                    setDrawerContactId(row.id);
                    setIsDrawerOpen(true);
                }}
                isLoading={isLoading}
                emptyMessage={
                    <div className="space-y-3">
                        <p>No contacts match your filters.</p>
                        <Link href="/contacts/new" className="text-indigo-300 hover:text-white">
                            Add your next lead
                        </Link>
                    </div>
                }
            />

            <ContactDrawer
                contact={selectedProfile}
                open={isDrawerOpen && Boolean(selectedProfile)}
                onClose={() => setIsDrawerOpen(false)}
                onConvert={handleConvertContact}
                isConverting={conversionTarget === selectedProfile?.id}
            />
        </div>
    );
}

function getStageBadge(stage: ContactTableRow['stage']): string {
    switch (stage) {
        case 'hot':
            return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
        case 'warm':
            return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
        default:
            return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200';
    }
}

function KpiCard({ label, value, helper }: { label: string; value: string; helper: string }) {
    return (
        <div className="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-5 shadow-xl shadow-slate-950/40">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-xs text-slate-500">{helper}</p>
        </div>
    );
}

