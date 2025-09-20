import * as React from 'react';

import type { GalleryRecord } from '../../data/crm';
import type { DropboxFileMetadata } from '../../types/dropbox';
import { DropboxChooserButton, type DropboxChooserFile } from './DropboxChooserButton';

type DropboxImportPanelProps = {
    galleries: GalleryRecord[];
    onImportComplete?: (result: { imported: number; skipped: number }) => void;
};

type ImportResponse = {
    data?: { imported: number; skipped: number };
    error?: string;
};

type ListFolderResponse = {
    data?: { entries: DropboxFileMetadata[] };
    error?: string;
};

const PRIMARY_BUTTON_CLASS =
    'inline-flex items-center justify-center rounded-full bg-[#4DE5FF] px-4 py-2 text-sm font-semibold text-slate-950 shadow transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#4DE5FF]/80 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#3D7CFF] dark:text-white dark:focus:ring-offset-slate-950';

const SECONDARY_BUTTON_CLASS =
    'inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF]/60 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900/40 dark:focus:ring-offset-slate-900';

function findDefaultGalleryId(galleries: GalleryRecord[]): string | '' {
    if (!Array.isArray(galleries) || galleries.length === 0) {
        return '';
    }

    const pending = galleries.find((gallery) => gallery.status === 'Pending');
    if (pending) {
        return pending.id;
    }

    return galleries[0]?.id ?? '';
}

function normalizeFolderInput(path: string): string {
    const trimmed = path.trim();

    if (!trimmed) {
        return '';
    }

    if (trimmed === '/') {
        return '/';
    }

    return trimmed.replace(/\/+$/, '');
}

function resolveAssetPath(asset: DropboxFileMetadata, fallbackFolder: string | null): string {
    if (asset.pathDisplay) {
        return asset.pathDisplay;
    }

    if (asset.pathLower) {
        return asset.pathLower;
    }

    if (!fallbackFolder) {
        return asset.name;
    }

    const normalizedFolder = normalizeFolderInput(fallbackFolder);

    if (!normalizedFolder || normalizedFolder === '/') {
        return `/${asset.name}`;
    }

    return `${normalizedFolder}/${asset.name}`;
}

function formatBytes(size: number | null): string {
    if (typeof size !== 'number' || Number.isNaN(size)) {
        return '—';
    }

    if (size < 1024) {
        return `${size} B`;
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = size / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const precision = value >= 10 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatModifiedDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    try {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '—';
        }

        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    } catch (error) {
        return '—';
    }
}

function buildImportResultMessage(imported: number, skipped: number, requestedCount?: number | null): string {
    const base = `Imported ${imported} file${imported === 1 ? '' : 's'} from Dropbox`;

    if (typeof requestedCount === 'number') {
        const unresolved = Math.max(requestedCount - imported - skipped, 0);
        const details = [
            skipped > 0 ? `${skipped} duplicate${skipped === 1 ? '' : 's'}` : null,
            unresolved > 0 ? `${unresolved} unresolved` : null
        ].filter(Boolean);

        if (details.length > 0) {
            return `${base} (${details.join(', ')}).`;
        }

        return `${base}.`;
    }

    if (skipped > 0) {
        return `${base} (${skipped} duplicate${skipped === 1 ? '' : 's'}).`;
    }

    return `${base}.`;
}

export function DropboxImportPanel({ galleries, onImportComplete }: DropboxImportPanelProps) {
    const galleryOptions = React.useMemo(
        () =>
            galleries.map((gallery) => ({
                value: gallery.id,
                label: `${gallery.client} · ${gallery.shootType}`,
                clientName: gallery.client
            })),
        [galleries]
    );

    const [selectedGalleryId, setSelectedGalleryId] = React.useState<string>(() => findDefaultGalleryId(galleries));
    const [importing, setImporting] = React.useState(false);
    const [loadingFolder, setLoadingFolder] = React.useState(false);
    const [resultMessage, setResultMessage] = React.useState<string | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [folderPath, setFolderPath] = React.useState('');
    const [triggerZapier, setTriggerZapier] = React.useState(true);
    const [folderEntries, setFolderEntries] = React.useState<DropboxFileMetadata[]>([]);
    const [selectedAssetIds, setSelectedAssetIds] = React.useState<Set<string>>(() => new Set());

    React.useEffect(() => {
        if (!selectedGalleryId && galleryOptions.length > 0) {
            setSelectedGalleryId(galleryOptions[0].value);
        }
    }, [galleryOptions, selectedGalleryId]);

    React.useEffect(() => {
        setSelectedAssetIds(new Set(folderEntries.map((entry) => entry.id)));
    }, [folderEntries]);

    const selectedGallery = React.useMemo(
        () => galleryOptions.find((option) => option.value === selectedGalleryId) ?? null,
        [galleryOptions, selectedGalleryId]
    );

    const toggleAsset = React.useCallback((assetId: string) => {
        setSelectedAssetIds((previous) => {
            const next = new Set(previous);

            if (next.has(assetId)) {
                next.delete(assetId);
            } else {
                next.add(assetId);
            }

            return next;
        });
    }, []);

    const toggleAllAssets = React.useCallback(() => {
        setSelectedAssetIds((previous) => {
            if (folderEntries.length === 0) {
                return previous;
            }

            const allSelected = previous.size === folderEntries.length;

            if (allSelected) {
                return new Set();
            }

            return new Set(folderEntries.map((entry) => entry.id));
        });
    }, [folderEntries]);

    const handleLoadFolder = React.useCallback(async () => {
        setLoadingFolder(true);
        setErrorMessage(null);
        setResultMessage(null);

        try {
            const response = await fetch('/api/dropbox/list-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: folderPath })
            });

            const payload = (await response.json()) as ListFolderResponse;

            if (!response.ok) {
                setFolderEntries([]);
                setErrorMessage(payload.error || 'Unable to load Dropbox folder contents.');
                return;
            }

            const entries = Array.isArray(payload.data?.entries) ? payload.data?.entries ?? [] : [];
            setFolderEntries(entries);

            if (entries.length === 0) {
                setResultMessage('No files were found in the selected Dropbox folder.');
            } else {
                setResultMessage(`Loaded ${entries.length} Dropbox file${entries.length === 1 ? '' : 's'} for review.`);
            }
        } catch (error) {
            console.error('Failed to list Dropbox folder', error);
            setFolderEntries([]);
            setErrorMessage('Unexpected error while loading the Dropbox folder. Check console for details.');
        } finally {
            setLoadingFolder(false);
        }
    }, [folderPath]);

    const executeImport = React.useCallback(
        async (
            body: Record<string, unknown>,
            { requestedCount }: { requestedCount?: number | null } = {}
        ) => {
            setImporting(true);
            setErrorMessage(null);
            setResultMessage(null);

            try {
                const response = await fetch('/api/galleries/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const payload = (await response.json()) as ImportResponse;

                if (!response.ok) {
                    setErrorMessage(payload.error || 'Failed to import Dropbox assets.');
                    return;
                }

                const imported =
                    payload.data?.imported ?? (typeof requestedCount === 'number' ? requestedCount : 0);
                const skipped = payload.data?.skipped ?? 0;

                setResultMessage(buildImportResultMessage(imported, skipped, requestedCount));

                if (onImportComplete) {
                    onImportComplete({ imported, skipped });
                }
            } catch (error) {
                console.error('Dropbox import failed', error);
                setErrorMessage('Unexpected error while importing from Dropbox. Check console for details.');
            } finally {
                setImporting(false);
            }
        },
        [onImportComplete]
    );

    const handleChooserImport = React.useCallback(
        async (files: DropboxChooserFile[]) => {
            if (!selectedGalleryId) {
                setResultMessage(null);
                setErrorMessage('Choose a gallery before importing Dropbox assets.');
                return;
            }

            if (!Array.isArray(files) || files.length === 0) {
                return;
            }

            await executeImport(
                {
                    galleryId: selectedGalleryId,
                    galleryName: selectedGallery?.label,
                    clientName: selectedGallery?.clientName,
                    triggerZapier,
                    selection: files
                },
                { requestedCount: undefined }
            );
        },
        [executeImport, selectedGallery, selectedGalleryId, triggerZapier]
    );

    const handleImport = React.useCallback(async () => {
        if (!selectedGalleryId) {
            setErrorMessage('Choose a gallery before importing Dropbox assets.');
            return;
        }

        if (selectedAssetIds.size === 0) {
            setErrorMessage('Select at least one Dropbox file to import.');
            return;
        }

        const selectedAssets = folderEntries.filter((entry) => selectedAssetIds.has(entry.id));

        if (selectedAssets.length === 0) {
            setErrorMessage('Selected files are no longer available. Reload the folder and try again.');
            return;
        }

        const fallbackFolder = folderPath || null;
        const assets = selectedAssets.map((asset) => ({
            dropboxFileId: asset.id,
            dropboxPath: resolveAssetPath(asset, fallbackFolder),
            fileName: asset.name
        }));

        await executeImport(
            {
                galleryId: selectedGalleryId,
                galleryName: selectedGallery?.label,
                clientName: selectedGallery?.clientName,
                folderPath: fallbackFolder,
                triggerZapier,
                assets
            },
            { requestedCount: selectedAssets.length }
        );
    }, [
        executeImport,
        folderEntries,
        folderPath,
        selectedAssetIds,
        selectedGallery,
        selectedGalleryId,
        triggerZapier
    ]);

    const allSelected = folderEntries.length > 0 && selectedAssetIds.size === folderEntries.length;
    const selectedCount = selectedAssetIds.size;

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Attach files to gallery
                    <select
                        className="rounded-xl border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
                        value={selectedGalleryId}
                        onChange={(event) => setSelectedGalleryId(event.target.value)}
                    >
                        {galleryOptions.length === 0 ? <option value="">No galleries configured</option> : null}
                        {galleryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Dropbox folder path
                    <input
                        type="text"
                        value={folderPath}
                        onChange={(event) => setFolderPath(event.target.value)}
                        placeholder="/Clients/2025-05-14-sanders"
                        className="rounded-xl border border-slate-300 bg-white/70 px-4 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
                    />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleLoadFolder}
                        className={SECONDARY_BUTTON_CLASS}
                        disabled={loadingFolder}
                    >
                        {loadingFolder ? 'Loading…' : 'Preview folder'}
                    </button>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-[#4DE5FF] focus:ring-[#4DE5FF] dark:border-slate-600"
                            checked={triggerZapier}
                            onChange={(event) => setTriggerZapier(event.target.checked)}
                        />
                        Trigger Zapier webhook for new imports
                    </label>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Preview Dropbox folders through the authenticated API, select the files you need, or launch the Dropbox chooser to import files and entire folders directly into the
                    <code className="ml-1 rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">dropbox_assets</code> table. Server-side token exchange keeps access tokens secure while the CRM records duplicate-resistant metadata.
                </p>
            </div>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={importing || selectedCount === 0}
                        className={PRIMARY_BUTTON_CLASS}
                    >
                        {importing
                            ? 'Importing…'
                            : selectedCount > 0
                              ? `Import ${selectedCount} file${selectedCount === 1 ? '' : 's'}`
                              : 'Import selected files'}
                    </button>
                    {folderEntries.length > 0 ? (
                        <button
                            type="button"
                            onClick={toggleAllAssets}
                            className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                        >
                            {allSelected ? 'Clear selection' : 'Select all'}
                        </button>
                    ) : null}
                </div>
                <DropboxChooserButton
                    onSelect={handleChooserImport}
                    disabled={importing}
                    folderselect
                    className={PRIMARY_BUTTON_CLASS}
                >
                    Import via Dropbox chooser
                </DropboxChooserButton>
                {resultMessage ? <p className="text-sm text-emerald-500">{resultMessage}</p> : null}
                {errorMessage ? <p className="text-sm text-rose-500">{errorMessage}</p> : null}
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dropbox folder preview</p>
                        {folderEntries.length > 0 ? (
                            <span className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
                                {selectedCount}/{folderEntries.length} selected
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-3 max-h-80 overflow-y-auto">
                        {loadingFolder ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Loading Dropbox files…</p>
                        ) : folderEntries.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Load a Dropbox folder to review its contents before importing files.
                            </p>
                        ) : (
                            <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-700">
                                {folderEntries.map((entry) => {
                                    const modified = entry.clientModified ?? entry.serverModified ?? null;
                                    const sizeLabel = formatBytes(entry.size ?? null);

                                    return (
                                        <li key={entry.id} className="flex items-start gap-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedAssetIds.has(entry.id)}
                                                onChange={() => toggleAsset(entry.id)}
                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#4DE5FF] focus:ring-[#4DE5FF] dark:border-slate-600"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-700 dark:text-slate-100">{entry.name}</p>
                                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                                    {entry.pathDisplay ?? entry.pathLower ?? 'Path unavailable'}
                                                </p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                                    {sizeLabel} · Modified {formatModifiedDate(modified)}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                    <p className="font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Dropbox API tips</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>Use the Dropbox chooser to import files or entire folders without copying paths manually.</li>
                        <li>Use refresh-token credentials (`DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN`) to keep imports private.</li>
                        <li>Preview folders before importing to confirm Dropbox automations delivered the right files.</li>
                        <li>Zapier events include resolved metadata, making downstream notifications and audits accurate.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
