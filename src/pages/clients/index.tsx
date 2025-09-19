import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import type { GetStaticProps } from 'next';
import type { ColumnDef, PaginationState, RowSelectionState, SortingState } from '@tanstack/react-table';

import { CrmAuthGuard, WorkspaceLayout } from '../../components/crm';
import DataToolbar, { type ToolbarFilter, type SortOption } from '../../components/data/DataToolbar';
import DataTable from '../../components/data/DataTable';
import ClientDrawer from '../../components/clients/ClientDrawer';
import {
    loadClientDashboardData,
    type ClientDashboardData,
    type ClientTableRow,
    type ClientProfile
} from '../../lib/api/clients';
import { formatCurrency, formatDate } from '../../lib/formatters';

type ClientsPageProps = ClientDashboardData;

type QueryState = {
    q?: string;
    status?: string;
    tags?: string;
    balance?: string;
    portal?: string;
    activity?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
};

const SORT_OPTIONS: Array<SortOption & { state: SortingState }> = [
    { id: 'name-asc', label: 'Name (A-Z)', state: [{ id: 'name', desc: false }] },
    { id: 'name-desc', label: 'Name (Z-A)', state: [{ id: 'name', desc: true }] },
    { id: 'activity-desc', label: 'Last activity (newest)', state: [{ id: 'lastActivityAt', desc: true }] },
    { id: 'activity-asc', label: 'Last activity (oldest)', state: [{ id: 'lastActivityAt', desc: false }] },
    { id: 'invoices-desc', label: 'Invoices (high to low)', state: [{ id: 'invoices', desc: true }] },
    { id: 'balance-desc', label: 'Balance (high to low)', state: [{ id: 'outstandingBalanceCents', desc: true }] }
];

const DEFAULT_SORT_OPTION = SORT_OPTIONS[0];

export const getStaticProps: GetStaticProps<ClientsPageProps> = async () => {
    const data = await loadClientDashboardData();
    return { props: data };
};

export default function ClientsPage(props: ClientsPageProps) {
    return (
        <CrmAuthGuard>
            <WorkspaceLayout>
                <Head>
                    <title>Clients | Codex CRM</title>
                </Head>
                <ClientsWorkspace {...props} />
            </WorkspaceLayout>
        </CrmAuthGuard>
    );
}

function ClientsWorkspace({ rows, profiles }: ClientsPageProps) {
    const router = useRouter();

    const parseQueryList = React.useCallback((value: string | string[] | undefined): string[] => {
        if (Array.isArray(value)) {
            return value.flatMap((item) => item.split(',')).filter(Boolean);
        }
        if (typeof value === 'string') {
            return value.split(',').map((entry) => entry.trim()).filter(Boolean);
        }
        return [];
    }, []);

    const initialSearch = typeof router.query.q === 'string' ? router.query.q : '';
    const initialStatus = parseQueryList(router.query.status);
    const initialTags = parseQueryList(router.query.tags);
    const initialBalance = parseQueryList(router.query.balance);
    const initialPortal = parseQueryList(router.query.portal);
    const initialActivity = parseQueryList(router.query.activity);
    const initialSortId = typeof router.query.sort === 'string' ? router.query.sort : DEFAULT_SORT_OPTION.id;
    const initialSort = SORT_OPTIONS.find((option) => option.id === initialSortId) ?? DEFAULT_SORT_OPTION;
    const initialPageIndex = (() => {
        const value = typeof router.query.page === 'string' ? Number.parseInt(router.query.page, 10) : 1;
        return Number.isFinite(value) && value > 0 ? value - 1 : 0;
    })();
    const initialPageSize = (() => {
        const value = typeof router.query.pageSize === 'string' ? Number.parseInt(router.query.pageSize, 10) : 10;
        return Number.isFinite(value) && value > 0 ? value : 10;
    })();

    const [search, setSearch] = React.useState<string>(initialSearch);
    const [statusFilter, setStatusFilter] = React.useState<string[]>(initialStatus);
    const [tagFilter, setTagFilter] = React.useState<string[]>(initialTags);
    const [balanceFilter, setBalanceFilter] = React.useState<string[]>(initialBalance);
    const [portalFilter, setPortalFilter] = React.useState<string[]>(initialPortal);
    const [activityFilter, setActivityFilter] = React.useState<string[]>(initialActivity);
    const [sortValue, setSortValue] = React.useState<string>(initialSort.id);
    const [sorting, setSorting] = React.useState<SortingState>(initialSort.state);
    const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: initialPageIndex, pageSize: initialPageSize });
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
    const [drawerClientId, setDrawerClientId] = React.useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);
    const [copiedPortalId, setCopiedPortalId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!copiedPortalId) {
            return;
        }
        const timer = window.setTimeout(() => setCopiedPortalId(null), 2000);
        return () => window.clearTimeout(timer);
    }, [copiedPortalId]);

    const tagOptions = React.useMemo(() => {
        const unique = new Set<string>();
        rows.forEach((row) => {
            row.tags.forEach((tag) => unique.add(tag));
        });
        return Array.from(unique).sort();
    }, [rows]);

    const filters = React.useMemo<ToolbarFilter[]>(() => {
        const statusFilterOptions = [
            { value: 'Active', label: 'Active' },
            { value: 'Lead', label: 'Lead' },
            { value: 'Lost', label: 'Lost' }
        ];

        const balanceOptions = [
            { value: 'with-balance', label: 'With balance' },
            { value: 'zero-balance', label: 'Balance cleared' }
        ];

        const portalOptions = [{ value: 'portal-ready', label: 'Portal ready' }];

        const activityOptions = [
            { value: 'last-30', label: 'Last 30 days' },
            { value: 'last-90', label: 'Last 90 days' },
            { value: 'no-activity', label: 'No recent activity' }
        ];

        return [
            { id: 'status', label: 'Status', options: statusFilterOptions, value: statusFilter, onChange: setStatusFilter },
            {
                id: 'tags',
                label: 'Tags',
                options: tagOptions.map((tag) => ({ value: tag, label: tag })),
                value: tagFilter,
                onChange: setTagFilter
            },
            { id: 'balance', label: 'Balance', options: balanceOptions, value: balanceFilter, onChange: setBalanceFilter },
            { id: 'activity', label: 'Last activity', options: activityOptions, value: activityFilter, onChange: setActivityFilter },
            { id: 'portal', label: 'Portal', options: portalOptions, value: portalFilter, onChange: setPortalFilter }
        ];
    }, [activityFilter, balanceFilter, portalFilter, setActivityFilter, setBalanceFilter, setPortalFilter, setStatusFilter, setTagFilter, statusFilter, tagFilter, tagOptions]);

    const filteredRows = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const now = dayjs();

        return rows.filter((row) => {
            if (normalizedSearch) {
                const haystack = [row.name, row.email ?? '', row.phone ?? '', row.owner ?? '']
                    .map((value) => value.toLowerCase())
                    .some((value) => value.includes(normalizedSearch));
                if (!haystack) {
                    return false;
                }
            }

            if (statusFilter.length > 0 && !statusFilter.includes(row.status)) {
                return false;
            }

            if (tagFilter.length > 0 && !row.tags.some((tag) => tagFilter.includes(tag))) {
                return false;
            }

            if (balanceFilter.includes('with-balance') && row.outstandingBalanceCents <= 0) {
                return false;
            }

            if (balanceFilter.includes('zero-balance') && row.outstandingBalanceCents > 0) {
                return false;
            }

            if (portalFilter.includes('portal-ready') && !row.hasPortal) {
                return false;
            }

            if (activityFilter.length > 0) {
                const lastActivity = row.lastActivityAt ? dayjs(row.lastActivityAt) : null;
                const matchesActivity = activityFilter.some((filter) => {
                    if (filter === 'last-30') {
                        return lastActivity ? now.diff(lastActivity, 'day') <= 30 : false;
                    }
                    if (filter === 'last-90') {
                        return lastActivity ? now.diff(lastActivity, 'day') <= 90 : false;
                    }
                    if (filter === 'no-activity') {
                        return !row.lastActivityAt;
                    }
                    return true;
                });

                if (!matchesActivity) {
                    return false;
                }
            }

            return true;
        });
    }, [activityFilter, balanceFilter, portalFilter, rows, search, statusFilter, tagFilter]);

    React.useEffect(() => {
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
        setRowSelection({});
    }, [filteredRows.length, search, statusFilter, tagFilter, balanceFilter, portalFilter, activityFilter]);

    React.useEffect(() => {
        const maxPageIndex = Math.max(0, Math.ceil(filteredRows.length / pagination.pageSize) - 1);
        if (pagination.pageIndex > maxPageIndex) {
            setPagination((previous) => ({ ...previous, pageIndex: maxPageIndex }));
        }
    }, [filteredRows.length, pagination.pageIndex, pagination.pageSize]);

    const metrics = React.useMemo(() => {
        const activeClients = filteredRows.filter((row) => row.status === 'Active').length;
        const outstandingBalance = filteredRows.reduce((sum, row) => sum + row.outstandingBalanceCents, 0);
        const upcomingShoots = filteredRows.filter((row) => row.upcomingShootAt && dayjs(row.upcomingShootAt).isAfter(dayjs())).length;
        const portalReady = filteredRows.filter((row) => row.hasPortal).length;
        return { activeClients, outstandingBalance, upcomingShoots, portalReady };
    }, [filteredRows]);

    const columns = React.useMemo<ColumnDef<ClientTableRow>[]>(() => {
        return [
            {
                id: 'select',
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        aria-label="Select all clients"
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
                header: 'Client',
                cell: ({ row }) => {
                    const record = row.original;
                    return (
                        <div className="flex flex-col">
                            <span className="font-semibold text-white">{record.name}</span>
                            <span className="text-xs text-slate-400">{record.email ?? 'No email'} • {record.phone ?? '—'}</span>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <span className="inline-flex items-center rounded-full border border-indigo-400/50 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-100">
                        {row.original.status}
                    </span>
                )
            },
            {
                accessorKey: 'invoices',
                header: 'Invoices',
                cell: ({ row }) => <span className="font-medium text-slate-100">{row.original.invoices}</span>
            },
            {
                accessorKey: 'outstandingBalanceCents',
                header: 'Outstanding',
                cell: ({ row }) => (
                    <span className="font-semibold text-slate-100">{formatCurrency(row.original.outstandingBalanceCents)}</span>
                )
            },
            {
                accessorKey: 'lastActivityAt',
                header: 'Last activity',
                cell: ({ row }) => (
                    <span className="text-sm text-slate-300">
                        {row.original.lastActivityAt ? formatDate(row.original.lastActivityAt) : '—'}
                    </span>
                )
            },
            {
                accessorKey: 'upcomingShootAt',
                header: 'Upcoming shoot',
                cell: ({ row }) => (
                    <span className="text-sm text-slate-300">
                        {row.original.upcomingShootAt ? formatDate(row.original.upcomingShootAt) : '—'}
                    </span>
                )
            },
            {
                id: 'portal',
                header: 'Portal link',
                cell: ({ row }) => (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            void navigator.clipboard.writeText(row.original.portalUrl ?? '');
                            setCopiedPortalId(row.original.id);
                        }}
                        className="text-xs font-medium text-indigo-300 transition hover:text-white"
                    >
                        {copiedPortalId === row.original.id ? 'Copied!' : 'Copy link'}
                    </button>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setDrawerClientId(row.original.id);
                                setIsDrawerOpen(true);
                            }}
                            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
                        >
                            View
                        </button>
                        <Link
                            href={`/projects`}
                            onClick={(event) => event.stopPropagation()}
                            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
                        >
                            Projects
                        </Link>
                    </div>
                ),
                enableSorting: false
            }
        ];
    }, [copiedPortalId]);

    const selectedCount = Object.keys(rowSelection).length;

    const bulkActions = (
        <div className="flex items-center gap-2">
            <button
                type="button"
                disabled={selectedCount === 0}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition enabled:hover:border-indigo-400 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
                Bulk actions
            </button>
        </div>
    );

    const hasActiveFilters =
        statusFilter.length > 0 ||
        tagFilter.length > 0 ||
        balanceFilter.length > 0 ||
        portalFilter.length > 0 ||
        activityFilter.length > 0;

    const resetFilters = () => {
        setStatusFilter([]);
        setTagFilter([]);
        setBalanceFilter([]);
        setPortalFilter([]);
        setActivityFilter([]);
    };

    const selectedProfile: ClientProfile | null = drawerClientId ? profiles[drawerClientId] ?? null : null;

    const activeSortOption = React.useMemo(() => {
        const option = SORT_OPTIONS.find((entry) => entry.id === sortValue);
        return option ?? DEFAULT_SORT_OPTION;
    }, [sortValue]);

    React.useEffect(() => {
        const option = SORT_OPTIONS.find((entry) => entry.id === sortValue);
        if (option) {
            setSorting(option.state);
        }
    }, [sortValue]);

    const handleSortingChange = React.useCallback((updater: SortingState | ((old: SortingState) => SortingState)) => {
        setSorting((previous) => {
            const next = typeof updater === 'function' ? updater(previous) : updater;
            if (next.length > 0) {
                const candidate = SORT_OPTIONS.find(
                    (option) => option.state.length === next.length && option.state.every((entry, index) => entry.id === next[index]?.id && entry.desc === next[index]?.desc)
                );
                if (candidate) {
                    setSortValue(candidate.id);
                }
            }
            return next;
        });
    }, []);

    const queryState: QueryState = React.useMemo(() => {
        const state: QueryState = {};
        if (search.trim()) state.q = search.trim();
        if (statusFilter.length > 0) state.status = statusFilter.join(',');
        if (tagFilter.length > 0) state.tags = tagFilter.join(',');
        if (balanceFilter.length > 0) state.balance = balanceFilter.join(',');
        if (portalFilter.length > 0) state.portal = portalFilter.join(',');
        if (activityFilter.length > 0) state.activity = activityFilter.join(',');
        if (sortValue !== DEFAULT_SORT_OPTION.id) state.sort = sortValue;
        if (pagination.pageIndex > 0) state.page = String(pagination.pageIndex + 1);
        if (pagination.pageSize !== 10) state.pageSize = String(pagination.pageSize);
        return state;
    }, [activityFilter, balanceFilter, pagination.pageIndex, pagination.pageSize, portalFilter, search, sortValue, statusFilter, tagFilter]);

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

    return (
        <div className="flex flex-col gap-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Active clients" value={metrics.activeClients.toString()} helper="Tracked across all portfolios" />
                <KpiCard label="Outstanding balance" value={formatCurrency(metrics.outstandingBalance)} helper="Across selected filters" />
                <KpiCard label="Upcoming shoots" value={metrics.upcomingShoots.toString()} helper="Next 60 days" />
                <KpiCard label="Portal ready" value={metrics.portalReady.toString()} helper="Clients with live portals" />
            </section>

            <DataToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search clients by name, email, phone, owner…"
                filters={filters}
                hasActiveFilters={hasActiveFilters}
                onResetFilters={resetFilters}
                sortOptions={SORT_OPTIONS.map(({ id, label }) => ({ id, label }))}
                sortValue={activeSortOption.id}
                onSortChange={setSortValue}
                primaryAction={{ label: 'Add client', href: '/clients/new' }}
                selectedCount={selectedCount}
                bulkActions={bulkActions}
                pageSize={pagination.pageSize}
                onPageSizeChange={(value) => setPagination((previous) => ({ ...previous, pageSize: value }))}
            />

            <DataTable<ClientTableRow>
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
                    setDrawerClientId(row.id);
                    setIsDrawerOpen(true);
                }}
                emptyMessage={
                    <div className="space-y-3">
                        <p>No clients match your filters yet.</p>
                        <Link href="/clients/new" className="text-indigo-300 hover:text-white">
                            Add a new client
                        </Link>
                    </div>
                }
            />

            <ClientDrawer client={selectedProfile} open={isDrawerOpen && Boolean(selectedProfile)} onClose={() => setIsDrawerOpen(false)} />
        </div>
    );
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

