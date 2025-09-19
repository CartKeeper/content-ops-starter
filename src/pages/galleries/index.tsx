import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dayjs from 'dayjs';

import {
    ApertureMark,
    CrmAuthGuard,
    SectionCard,
    StatCard,
    StatusPill,
    WorkspaceLayout,
    DropboxImportPanel,
    useCrmAuth,
    type StatusTone
} from '../../components/crm';
import { FolderIcon, GalleryIcon, UsersIcon } from '../../components/crm/icons';
import { clients, galleryCollection, projectPipeline, type GalleryRecord, type ProjectRecord } from '../../data/crm';
import type { ClientRecord } from '../../components/crm/ClientTable';
import type { DropboxAssetRecord, AssetSyncStatus } from '../../types/dropbox';

const FILTER_ALL = '__all__';
const FILTER_UNASSIGNED = '__unassigned__';
const FILTER_FOLDER_UNASSIGNED = '__folder-unassigned__';

const statusToneMap: Record<AssetSyncStatus, StatusTone> = {
    Synced: 'success',
    Syncing: 'info',
    Pending: 'warning',
    Error: 'danger',
    Archived: 'neutral'
};

type SelectOption = { value: string; label: string; count?: number };

type GalleryUsageSummary = {
    key: string;
    totalBytes: number;
    assetCount: number;
    folderPath: string;
    galleryId: string | null;
    galleryName: string | null;
    clientName: string | null;
};

type FilterState = {
    folder: string;
    client: string;
    project: string;
    query: string;
};

function DropboxAssetLibrary() {
    const [assets, setAssets] = React.useState<DropboxAssetRecord[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [filters, setFilters] = React.useState<FilterState>({
        folder: FILTER_ALL,
        client: FILTER_ALL,
        project: FILTER_ALL,
        query: ''
    });
    const [savingState, setSavingState] = React.useState<Record<string, boolean>>({});
    const [updateErrors, setUpdateErrors] = React.useState<Record<string, string | null>>({});

    const { signOut, guardEnabled } = useCrmAuth();

    const clientsById = React.useMemo(() => buildIdMap(clients), []);
    const projectsById = React.useMemo(() => buildIdMap(projectPipeline), []);
    const galleriesById = React.useMemo(() => buildGalleryIdMap(galleryCollection), []);

    React.useEffect(() => {
        let cancelled = false;

        async function loadAssets() {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/dropbox-assets');
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const payload = await response.json();
                const records = extractAssetArray(payload).map((item) => normalizeAssetRecord(item));

                if (!cancelled) {
                    setAssets(records);
                }
            } catch (loadError) {
                console.error('Unable to load Dropbox assets', loadError);
                if (!cancelled) {
                    setError(
                        'Unable to load Dropbox assets. Confirm the persistent store connection and try again.'
                    );
                    setAssets([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadAssets();

        return () => {
            cancelled = true;
        };
    }, []);

    const folderOptions = React.useMemo<SelectOption[]>(
        () => [
            { value: FILTER_ALL, label: 'All folders' },
            ...buildFolderOptions(assets)
        ],
        [assets]
    );

    const clientOptions = React.useMemo<SelectOption[]>(
        () => [
            { value: FILTER_ALL, label: 'All clients' },
            { value: FILTER_UNASSIGNED, label: 'Unassigned' },
            ...buildRelationshipOptions(assets, clientsById, (record) => record.clientId, (record) =>
                resolveClientName(record, clientsById)
            )
        ],
        [assets, clientsById]
    );

    const projectOptions = React.useMemo<SelectOption[]>(
        () => [
            { value: FILTER_ALL, label: 'All projects' },
            { value: FILTER_UNASSIGNED, label: 'Unassigned' },
            ...buildRelationshipOptions(assets, projectsById, (record) => record.projectId, (record) =>
                resolveProjectName(record, projectsById)
            )
        ],
        [assets, projectsById]
    );

    const filteredAssets = React.useMemo(() => {
        const query = filters.query.trim().toLowerCase();

        return assets.filter((asset) => {
            if (filters.folder !== FILTER_ALL) {
                if (filters.folder === FILTER_FOLDER_UNASSIGNED) {
                    if (asset.folderPath) {
                        return false;
                    }
                } else if (asset.folderPath !== filters.folder) {
                    return false;
                }
            }

            if (filters.client !== FILTER_ALL) {
                if (filters.client === FILTER_UNASSIGNED) {
                    if (asset.clientId) {
                        return false;
                    }
                } else if (asset.clientId !== filters.client) {
                    return false;
                }
            }

            if (filters.project !== FILTER_ALL) {
                if (filters.project === FILTER_UNASSIGNED) {
                    if (asset.projectId) {
                        return false;
                    }
                } else if (asset.projectId !== filters.project) {
                    return false;
                }
            }

            if (!query) {
                return true;
            }

            const haystack = [
                asset.fileName,
                asset.dropboxPath,
                asset.folderPath,
                resolveClientName(asset, clientsById) ?? undefined,
                resolveProjectName(asset, projectsById) ?? undefined,
                asset.galleryName ?? undefined
            ]
                .filter(Boolean)
                .map((value) => value!.toLowerCase());

            return haystack.some((value) => value.includes(query));
        });
    }, [assets, clientsById, filters.client, filters.folder, filters.project, filters.query, projectsById]);

    const totalStorageBytes = React.useMemo(
        () => assets.reduce((total, asset) => total + asset.sizeInBytes, 0),
        [assets]
    );

    const syncedAssets = React.useMemo(
        () => assets.filter((asset) => asset.status === 'Synced').length,
        [assets]
    );

    const connectedClients = React.useMemo(() => {
        const ids = new Set<string>();
        assets.forEach((asset) => {
            if (asset.clientId) {
                ids.add(asset.clientId);
            }
        });
        return ids.size;
    }, [assets]);

    const perGalleryUsage = React.useMemo<GalleryUsageSummary[]>(
        () => buildGalleryUsage(assets, galleriesById, clientsById),
        [assets, galleriesById, clientsById]
    );

    const activeGalleries = React.useMemo(
        () => perGalleryUsage.filter((entry) => entry.assetCount > 0).length,
        [perGalleryUsage]
    );

    const statCards = React.useMemo(
        () => {
            const syncedCoverage = assets.length ? (syncedAssets / assets.length) * 100 : 0;
            const galleryCoverage = galleryCollection.length
                ? (activeGalleries / galleryCollection.length) * 100
                : activeGalleries > 0
                    ? 100
                    : 0;
            const clientCoverage = clients.length
                ? (connectedClients / clients.length) * 100
                : connectedClients > 0
                    ? 100
                    : 0;

            return [
                {
                    id: 'assets',
                    title: 'Synced assets',
                    value: `${assets.length}`,
                    change: syncedCoverage,
                    changeLabel: 'Synced coverage',
                    icon: <GalleryIcon className="h-5 w-5" />
                },
                {
                    id: 'storage',
                    title: 'Storage used',
                    value: formatFileSize(totalStorageBytes),
                    change: galleryCoverage,
                    changeLabel: `${activeGalleries} galleries tracked`,
                    icon: <FolderIcon className="h-5 w-5" />
                },
                {
                    id: 'clients',
                    title: 'Linked clients',
                    value: `${connectedClients}`,
                    change: clientCoverage,
                    changeLabel: 'Client coverage',
                    icon: <UsersIcon className="h-5 w-5" />
                }
            ];
        },
        [activeGalleries, assets.length, connectedClients, syncedAssets, totalStorageBytes]
    );

    const averageAssetSize = assets.length ? totalStorageBytes / assets.length : 0;
    const largestAssetSize = assets.reduce((max, asset) => Math.max(max, asset.sizeInBytes), 0);
    const uniqueFolders = React.useMemo(() => {
        const set = new Set<string>();
        assets.forEach((asset) => set.add(asset.folderPath || ''));
        return set.size;
    }, [assets]);

    const unassignedAssets = React.useMemo(
        () => assets.filter((asset) => !asset.clientId && !asset.projectId).length,
        [assets]
    );

    const handleFilterChange = React.useCallback(
        (field: keyof FilterState, value: string) => {
            setFilters((previous) => ({ ...previous, [field]: value }));
        },
        []
    );

    const updateAsset = React.useCallback(
        async (assetId: string, update: Partial<DropboxAssetRecord>) => {
            setSavingState((previous) => ({ ...previous, [assetId]: true }));
            setUpdateErrors((previous) => ({ ...previous, [assetId]: null }));

            const payload = buildUpdatePayload(update);

            try {
                const response = await fetch(`/api/dropbox-assets?id=${encodeURIComponent(assetId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const payloadJson = await response.json();
                const updatedData = extractUpdatedRecord(payloadJson);

                setAssets((previous) =>
                    previous.map((asset) =>
                        asset.id === assetId
                            ? {
                                  ...asset,
                                  ...(updatedData ? normalizeAssetRecord(updatedData) : update)
                              }
                            : asset
                    )
                );
            } catch (updateError) {
                console.error('Failed to update asset relationship', updateError);
                const message =
                    updateError instanceof Error
                        ? updateError.message
                        : 'Update failed. Please try again.';
                setUpdateErrors((previous) => ({ ...previous, [assetId]: message }));
            } finally {
                setSavingState((previous) => {
                    const next = { ...previous };
                    delete next[assetId];
                    return next;
                });
            }
        },
        []
    );

    const handleClientChange = React.useCallback(
        (assetId: string, nextValue: string) => {
            const nextClientId = nextValue === FILTER_UNASSIGNED ? null : nextValue;
            const clientName = nextClientId ? clientsById.get(nextClientId)?.name ?? null : null;

            void updateAsset(assetId, { clientId: nextClientId, clientName });
        },
        [clientsById, updateAsset]
    );

    const handleProjectChange = React.useCallback(
        (assetId: string, nextValue: string) => {
            const nextProjectId = nextValue === FILTER_UNASSIGNED ? null : nextValue;
            const projectName = nextProjectId ? projectsById.get(nextProjectId)?.name ?? null : null;

            void updateAsset(assetId, { projectId: nextProjectId, projectName });
        },
        [projectsById, updateAsset]
    );

    const assignmentClientOptions = React.useMemo(
        () => clientOptions.filter((option) => option.value !== FILTER_ALL),
        [clientOptions]
    );

    const assignmentProjectOptions = React.useMemo(
        () => projectOptions.filter((option) => option.value !== FILTER_ALL),
        [projectOptions]
    );

    return (
        <>
            <Head>
                <title>Dropbox Asset Library · Studio CRM</title>
            </Head>
            <WorkspaceLayout>
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-10">
                    <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#4534FF] dark:text-[#9DAAFF]">
                                Dropbox sync
                            </p>
                            <h1 className="mt-2 flex items-center gap-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10">
                                    <ApertureMark className="h-7 w-7 text-[#4DE5FF]" />
                                </span>
                                Asset library
                            </h1>
                            <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
                                Review Dropbox-synced assets, confirm storage usage, and link files to CRM clients or active projects without leaving the studio dashboard.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {guardEnabled ? (
                                <button
                                    type="button"
                                    onClick={signOut}
                                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:text-slate-200 dark:hover:text-white"
                                >
                                    Sign out
                                </button>
                            ) : null}
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4DE5FF] focus:ring-offset-slate-950"
                            >
                                Return to CRM dashboard
                            </Link>
                        </div>
                    </header>

                    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {statCards.map((card) => (
                            <StatCard
                                key={card.id}
                                title={card.title}
                                value={card.value}
                                change={card.change}
                                changeLabel={card.changeLabel}
                                icon={card.icon}
                            />
                        ))}
                    </section>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <SectionCard
                            title="Storage health overview"
                            description="Understand how Dropbox usage maps to CRM galleries and confirm database footprint for auditing."
                        >
                            <dl className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                                    <dt className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                        Total storage used
                                    </dt>
                                    <dd className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                                        {formatFileSize(totalStorageBytes)}
                                    </dd>
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        {assets.length} assets across {perGalleryUsage.length} galleries / folders
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                                    <dt className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                        Average asset size
                                    </dt>
                                    <dd className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                                        {formatFileSize(averageAssetSize)}
                                    </dd>
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        Largest file uses {formatFileSize(largestAssetSize)} of storage
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                                    <dt className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                        Unique Dropbox folders
                                    </dt>
                                    <dd className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{uniqueFolders}</dd>
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        {unassignedAssets} assets are not attached to a client or project
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                                    <dt className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                        Synced this week
                                    </dt>
                                    <dd className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                                        {assetsSyncedThisWeek(assets)}
                                    </dd>
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        Track recent uploads to confirm Dropbox automations are flowing
                                    </p>
                                </div>
                            </dl>
                        </SectionCard>

                        <SectionCard
                            title="Per-gallery storage usage"
                            description="Spot storage spikes and validate Dropbox folders aligned with CRM galleries."
                        >
                            {perGalleryUsage.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                            <tr>
                                                <th className="pb-3 pr-4 font-semibold">Gallery</th>
                                                <th className="pb-3 pr-4 font-semibold">Dropbox folder</th>
                                                <th className="pb-3 pr-4 font-semibold">Assets</th>
                                                <th className="pb-3 font-semibold">Storage</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
                                            {perGalleryUsage.map((entry) => (
                                                <tr key={entry.key} className="align-top">
                                                    <td className="py-3 pr-4">
                                                        <p className="font-semibold text-slate-900 dark:text-white">
                                                            {entry.galleryName ?? 'Unlinked assets'}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                            {entry.clientName ?? 'No client mapped'}
                                                        </p>
                                                    </td>
                                                    <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">
                                                        {entry.folderPath ? entry.folderPath : '—'}
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                        {entry.assetCount}
                                                    </td>
                                                    <td className="py-3 text-sm font-semibold text-slate-900 dark:text-white">
                                                        {formatFileSize(entry.totalBytes)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    No Dropbox assets have been synced yet. Once files arrive, storage usage by gallery will appear here.
                                </p>
                            )}
                        </SectionCard>
                    </div>

                    <SectionCard
                        title="Dropbox import pipeline"
                        description="Launch the Dropbox Chooser, attach files to CRM galleries, and optionally notify Zapier automations."
                    >
                        <DropboxImportPanel galleries={galleryCollection} />
                    </SectionCard>

                    <SectionCard
                        title="Dropbox asset inventory"
                        description="Review thumbnails, metadata, and attach Dropbox files to CRM clients or in-flight projects."
                        action={
                            <span className="text-sm font-semibold text-[#4534FF] dark:text-[#9DAAFF]">
                                Showing {filteredAssets.length} of {assets.length} assets
                            </span>
                        }
                    >
                        <div className="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                            <div className="flex min-w-[12rem] flex-1 flex-col">
                                <label className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                    Search assets
                                    <input
                                        type="search"
                                        value={filters.query}
                                        onChange={(event) => handleFilterChange('query', event.target.value)}
                                        placeholder="Search by file name, client, or project"
                                        className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-[#4DE5FF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100"
                                    />
                                </label>
                            </div>
                            <div className="flex min-w-[12rem] flex-col">
                                <label className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                    Dropbox folder
                                    <select
                                        value={filters.folder}
                                        onChange={(event) => handleFilterChange('folder', event.target.value)}
                                        className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#4DE5FF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100"
                                    >
                                        {folderOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.count != null ? `${option.label} (${option.count})` : option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div className="flex min-w-[12rem] flex-col">
                                <label className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                    Client
                                    <select
                                        value={filters.client}
                                        onChange={(event) => handleFilterChange('client', event.target.value)}
                                        className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#4DE5FF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100"
                                    >
                                        {clientOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.count != null ? `${option.label} (${option.count})` : option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div className="flex min-w-[12rem] flex-col">
                                <label className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                    Project
                                    <select
                                        value={filters.project}
                                        onChange={(event) => handleFilterChange('project', event.target.value)}
                                        className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#4DE5FF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100"
                                    >
                                        {projectOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.count != null ? `${option.label} (${option.count})` : option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>
                        {error ? (
                            <p className="mt-4 text-sm font-semibold text-rose-500 dark:text-rose-300">{error}</p>
                        ) : null}
                        {isLoading ? (
                            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Loading Dropbox assets…</p>
                        ) : null}
                        {!isLoading && filteredAssets.length === 0 ? (
                            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                                No assets match the current filters. Adjust the search criteria or confirm Dropbox automation is running.
                            </p>
                        ) : null}
                        <ul className="mt-6 divide-y divide-slate-200 dark:divide-slate-800">
                            {filteredAssets.map((asset) => {
                                const isSaving = Boolean(savingState[asset.id]);
                                const assetError = updateErrors[asset.id];
                                const clientName = resolveClientName(asset, clientsById) ?? 'Unassigned';
                                const projectName = resolveProjectName(asset, projectsById) ?? 'Unassigned';
                                const statusTone = statusToneMap[asset.status] ?? 'neutral';

                                return (
                                    <li key={asset.id} className="py-6">
                                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="flex flex-1 gap-4">
                                                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
                {asset.thumbnailUrl ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={asset.thumbnailUrl}
                            alt={asset.fileName || 'Dropbox asset thumbnail'}
                            className="h-full w-full object-cover"
                        />
                    </>
                ) : (
                                                        <GalleryIcon className="h-9 w-9" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <p className="break-all text-sm font-semibold text-slate-900 dark:text-white">
                                                            {asset.fileName || asset.dropboxPath || asset.id}
                                                        </p>
                                                        <StatusPill tone={statusTone}>{asset.status}</StatusPill>
                                                        {isSaving ? (
                                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Saving…</span>
                                                        ) : null}
                                                    </div>
                                                    <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                                                        {asset.dropboxPath || 'Dropbox path unavailable'}
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                                        <span>{formatFileSize(asset.sizeInBytes)}</span>
                                                        {asset.mimeType ? <span>• {asset.mimeType}</span> : null}
                                                        {asset.width && asset.height ? (
                                                            <span>• {asset.width}×{asset.height}px</span>
                                                        ) : null}
                                                        {asset.syncedAt ? (
                                                            <span>• Synced {formatTimestamp(asset.syncedAt)}</span>
                                                        ) : null}
                                                    </div>
                                                    {asset.tags.length ? (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {asset.tags.map((tag) => (
                                                                <span
                                                                    key={`${asset.id}-${tag}`}
                                                                    className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex w-full flex-col gap-4 lg:w-64">
                                                <label className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                                    Client
                                                    <select
                                                        value={asset.clientId ?? FILTER_UNASSIGNED}
                                                        onChange={(event) => handleClientChange(asset.id, event.target.value)}
                                                        className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#4DE5FF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100"
                                                        disabled={isSaving}
                                                    >
                                                        {assignmentClientOptions.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                                                    Project
                                                    <select
                                                        value={asset.projectId ?? FILTER_UNASSIGNED}
                                                        onChange={(event) => handleProjectChange(asset.id, event.target.value)}
                                                        className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#4DE5FF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100"
                                                        disabled={isSaving}
                                                    >
                                                        {assignmentProjectOptions.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                                                    <p>
                                                        Linked client:
                                                        <span className="ml-1 font-semibold text-slate-700 dark:text-slate-200">{clientName}</span>
                                                    </p>
                                                    <p className="mt-1">
                                                        Project:
                                                        <span className="ml-1 font-semibold text-slate-700 dark:text-slate-200">{projectName}</span>
                                                    </p>
                                                </div>
                                                {asset.previewUrl ? (
                                                    <a
                                                        href={asset.previewUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-semibold text-[#4DE5FF] transition hover:text-white"
                                                    >
                                                        Open Dropbox preview ↗
                                                    </a>
                                                ) : null}
                                                {assetError ? (
                                                    <p className="text-xs font-semibold text-rose-500 dark:text-rose-300">
                                                        Failed to save update: {assetError}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </SectionCard>
                </div>
            </WorkspaceLayout>
        </>
    );
}

export default function GalleriesPage() {
    return (
        <CrmAuthGuard>
            <DropboxAssetLibrary />
        </CrmAuthGuard>
    );
}

function buildIdMap<T extends { id: string }>(records: T[]): Map<string, T> {
    const map = new Map<string, T>();
    records.forEach((record) => {
        if (record.id) {
            map.set(record.id, record);
        }
    });
    return map;
}

function buildGalleryIdMap(records: GalleryRecord[]): Map<string, GalleryRecord> {
    return buildIdMap(records);
}

function buildFolderOptions(assets: DropboxAssetRecord[]): SelectOption[] {
    const counts = new Map<string, number>();
    let unassigned = 0;

    assets.forEach((asset) => {
        if (asset.folderPath) {
            counts.set(asset.folderPath, (counts.get(asset.folderPath) ?? 0) + 1);
        } else {
            unassigned += 1;
        }
    });

    const options: SelectOption[] = [
        { value: FILTER_FOLDER_UNASSIGNED, label: 'Unfiled assets', count: unassigned }
    ];

    Array.from(counts.entries())
        .sort((first, second) => first[0].localeCompare(second[0], undefined, { sensitivity: 'base' }))
        .forEach(([folder, count]) => {
            options.push({ value: folder, label: folder, count });
        });

    return options;
}

function buildRelationshipOptions<T extends { id: string; name: string }>(
    assets: DropboxAssetRecord[],
    recordsById: Map<string, T>,
    idSelector: (record: DropboxAssetRecord) => string | null | undefined,
    labelSelector: (record: DropboxAssetRecord) => string | null | undefined
): SelectOption[] {
    const optionMap = new Map<string, { label: string; count: number }>();

    assets.forEach((asset) => {
        const id = idSelector(asset);
        if (!id) {
            return;
        }

        const record = recordsById.get(id);
        const label = record?.name ?? labelSelector(asset) ?? id;
        const entry = optionMap.get(id);

        if (entry) {
            entry.count += 1;
        } else {
            optionMap.set(id, { label, count: 1 });
        }
    });

    return Array.from(optionMap.entries())
        .map<SelectOption>(([value, details]) => ({ value, label: details.label, count: details.count }))
        .sort((first, second) => first.label.localeCompare(second.label, undefined, { sensitivity: 'base' }));
}

function buildGalleryUsage(
    assets: DropboxAssetRecord[],
    galleriesById: Map<string, GalleryRecord>,
    clientsById: Map<string, ClientRecord>
): GalleryUsageSummary[] {
    const usage = new Map<string, GalleryUsageSummary>();

    assets.forEach((asset) => {
        const key = asset.galleryId ?? asset.folderPath ?? '__unlinked__';
        const existing = usage.get(key);
        const base: GalleryUsageSummary =
            existing ?? {
                key,
                totalBytes: 0,
                assetCount: 0,
                folderPath: asset.folderPath,
                galleryId: asset.galleryId ?? null,
                galleryName: asset.galleryName ?? null,
                clientName: asset.clientName ?? null
            };

        base.totalBytes += asset.sizeInBytes;
        base.assetCount += 1;

        if (!base.folderPath && asset.folderPath) {
            base.folderPath = asset.folderPath;
        }

        if (asset.galleryId && galleriesById.has(asset.galleryId)) {
            const gallery = galleriesById.get(asset.galleryId)!;
            base.galleryName = base.galleryName ?? gallery.shootType;
            base.clientName = base.clientName ?? gallery.client;
        } else {
            if (!base.galleryName && asset.galleryName) {
                base.galleryName = asset.galleryName;
            }
            if (!base.clientName) {
                base.clientName = asset.clientId
                    ? clientsById.get(asset.clientId)?.name ?? asset.clientName ?? null
                    : asset.clientName ?? null;
            }
        }

        usage.set(key, base);
    });

    return Array.from(usage.values()).sort((first, second) => second.totalBytes - first.totalBytes);
}

function extractAssetArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && typeof payload === 'object') {
        const withData = payload as { data?: unknown; items?: unknown };
        if (Array.isArray(withData.data)) {
            return withData.data;
        }
        if (Array.isArray(withData.items)) {
            return withData.items;
        }
    }

    return [];
}

function extractUpdatedRecord(payload: unknown): unknown {
    if (payload && typeof payload === 'object') {
        const withData = payload as { data?: unknown };
        if (Array.isArray(withData.data)) {
            return withData.data[0] ?? null;
        }
        if (withData.data && typeof withData.data === 'object') {
            return withData.data;
        }
    }

    return null;
}

function buildUpdatePayload(update: Partial<DropboxAssetRecord>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if ('clientId' in update) {
        payload.clientId = update.clientId ?? null;
        payload.client_id = update.clientId ?? null;
    }
    if ('clientName' in update) {
        payload.clientName = update.clientName ?? null;
        payload.client_name = update.clientName ?? null;
    }
    if ('projectId' in update) {
        payload.projectId = update.projectId ?? null;
        payload.project_id = update.projectId ?? null;
    }
    if ('projectName' in update) {
        payload.projectName = update.projectName ?? null;
        payload.project_name = update.projectName ?? null;
    }
    if ('galleryId' in update) {
        payload.galleryId = update.galleryId ?? null;
        payload.gallery_id = update.galleryId ?? null;
    }
    if ('galleryName' in update) {
        payload.galleryName = update.galleryName ?? null;
        payload.gallery_name = update.galleryName ?? null;
    }

    return payload;
}

function normalizeAssetRecord(input: unknown): DropboxAssetRecord {
    if (!input || typeof input !== 'object') {
        return {
            id: 'unknown-asset',
            fileName: 'Unknown asset',
            dropboxPath: '',
            folderPath: '',
            sizeInBytes: 0,
            status: 'Synced',
            tags: []
        };
    }

    const record = input as Record<string, unknown>;

    const dropboxPath =
        parseOptionalString(record.dropboxPath) ??
        parseOptionalString(record.dropbox_path) ??
        parseOptionalString(record.path_lower) ??
        parseOptionalString(record.path_display) ??
        '';

    const id =
        parseOptionalString(record.id) ??
        parseOptionalString(record.asset_id) ??
        parseOptionalString(record.entry_id) ??
        (dropboxPath ? dropboxPath : 'unknown-asset');

    const fileName =
        parseOptionalString(record.fileName) ??
        parseOptionalString(record.file_name) ??
        (dropboxPath.includes('/') ? dropboxPath.split('/').pop() ?? '' : dropboxPath);

    const folderPath =
        parseOptionalString(record.folderPath) ??
        parseOptionalString(record.folder_path) ??
        (dropboxPath.includes('/') ? dropboxPath.slice(0, dropboxPath.lastIndexOf('/')) : '');

    const sizeInBytes =
        parseNumber(record.sizeInBytes ?? record.size ?? record.bytes ?? record.file_size ?? record.byteSize) ?? 0;

    const thumbnailUrl =
        parseOptionalString(record.thumbnailUrl ?? record.thumbnail_url ?? record.thumbnail ?? record.preview_image_url) ??
        undefined;

    const previewUrl =
        parseOptionalString(record.previewUrl ?? record.preview_url ?? record.url ?? record.share_url ?? record.link) ??
        undefined;

    const mimeType =
        parseOptionalString(record.mimeType ?? record.mime_type ?? record.content_type ?? record.type) ?? undefined;

    const checksum =
        parseOptionalString(record.checksum ?? record.content_hash ?? record.rev ?? record.hash) ?? undefined;

    const syncedAtRaw =
        parseOptionalString(
            record.syncedAt ??
                record.synced_at ??
                record.updated_at ??
                record.modified_at ??
                record.server_modified ??
                record.client_modified ??
                record.last_seen_at
        );
    const syncedAt = syncedAtRaw && dayjs(syncedAtRaw).isValid() ? dayjs(syncedAtRaw).toISOString() : undefined;

    const dimensions =
        record.dimensions && typeof record.dimensions === 'object'
            ? (record.dimensions as Record<string, unknown>)
            : undefined;
    const width =
        parseNumber(record.width ?? record.imageWidth ?? record.image_width ?? dimensions?.width ?? dimensions?.Width) ??
        undefined;
    const height =
        parseNumber(record.height ?? record.imageHeight ?? record.image_height ?? dimensions?.height ?? dimensions?.Height) ??
        undefined;

    const status = normalizeStatus(record.status ?? record.sync_status ?? record.state);
    const tags = normalizeTags(record.tags ?? record.labels ?? record.keywords);

    const clientId = parseOptionalString(record.clientId ?? record.client_id);
    const clientName = parseOptionalString(record.clientName ?? record.client_name);
    const projectId = parseOptionalString(record.projectId ?? record.project_id);
    const projectName = parseOptionalString(record.projectName ?? record.project_name);
    const galleryId = parseOptionalString(record.galleryId ?? record.gallery_id);
    const galleryName = parseOptionalString(record.galleryName ?? record.gallery_name);

    return {
        id,
        fileName,
        dropboxPath,
        folderPath,
        thumbnailUrl,
        previewUrl,
        sizeInBytes,
        mimeType,
        checksum,
        syncedAt,
        width,
        height,
        status,
        tags,
        clientId,
        clientName,
        projectId,
        projectName,
        galleryId,
        galleryName
    };
}

function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const thresholds = [
        { unit: 'TB', value: 1024 ** 4 },
        { unit: 'GB', value: 1024 ** 3 },
        { unit: 'MB', value: 1024 ** 2 },
        { unit: 'KB', value: 1024 }
    ];

    for (const threshold of thresholds) {
        if (bytes >= threshold.value) {
            return `${(bytes / threshold.value).toFixed(2)} ${threshold.unit}`;
        }
    }

    return `${bytes.toFixed(0)} B`;
}

function formatTimestamp(value: string): string {
    const date = dayjs(value);
    if (!date.isValid()) {
        return value;
    }
    return date.format('MMM D, YYYY h:mm A');
}

function assetsSyncedThisWeek(assets: DropboxAssetRecord[]): number {
    const startOfWeek = dayjs().startOf('week');
    return assets.filter((asset) => asset.syncedAt && dayjs(asset.syncedAt).isAfter(startOfWeek)).length;
}

function resolveClientName(asset: DropboxAssetRecord, clientsById: Map<string, ClientRecord>): string | null {
    if (asset.clientId) {
        const record = clientsById.get(asset.clientId);
        if (record) {
            return record.name;
        }
    }
    return asset.clientName ?? null;
}

function resolveProjectName(asset: DropboxAssetRecord, projectsById: Map<string, ProjectRecord>): string | null {
    if (asset.projectId) {
        const record = projectsById.get(asset.projectId);
        if (record) {
            return record.name;
        }
    }
    return asset.projectName ?? null;
}

function parseNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
        if (!cleaned) {
            return null;
        }
        const parsed = Number.parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function parseOptionalString(value: unknown): string | null {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return null;
}

function normalizeStatus(value: unknown): AssetSyncStatus {
    if (typeof value !== 'string') {
        return 'Synced';
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === 'pending' || normalized === 'queued') {
        return 'Pending';
    }
    if (normalized === 'error' || normalized === 'failed') {
        return 'Error';
    }
    if (normalized === 'syncing' || normalized === 'running') {
        return 'Syncing';
    }
    if (normalized === 'archived' || normalized === 'inactive') {
        return 'Archived';
    }

    return 'Synced';
}

function normalizeTags(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => parseOptionalString(item))
            .filter((item): item is string => !!item);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((segment) => segment.trim())
            .filter(Boolean);
    }

    return [];
}
