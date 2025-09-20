import * as React from 'react';

import type { GalleryRecord } from '../../data/crm';
import { DropboxChooserButton, type DropboxChooserFile } from './DropboxChooserButton';

type DropboxListFolderEntry = {
    '.tag': 'file' | 'folder' | 'deleted' | string;
    id?: string;
    name?: string;
    path_lower?: string;
    path_display?: string;
    client_modified?: string;
    server_modified?: string;
    size?: number;
    [key: string]: unknown;
};

type DropboxListFolderResponse = {
    entries?: DropboxListFolderEntry[];
    cursor?: string;
    has_more?: boolean;
};

type ListFolderRequest = {
    path?: string;
    sharedLinkUrl?: string;
};

type DropboxImportPanelProps = {
    galleries: GalleryRecord[];
    onImportComplete?: (result: { imported: number; skipped: number }) => void;
};

type ImportAsset = {
    dropboxFileId: string;
    dropboxPath: string;
    fileName: string;
    sizeInBytes: number;
    previewUrl?: string | null;
    thumbnailUrl?: string | null;
    link?: string | null;
    clientModified?: string | null;
    serverModified?: string | null;
};

type ImportResponse = {
    data?: { imported: number; skipped: number };
    error?: string;
};

function resolveDropboxAccessToken(): string | null {
    if (typeof process === 'undefined' || typeof process.env === 'undefined') {
        return null;
    }

    const candidates = [
        process.env.NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN,
        process.env.NEXT_PUBLIC_DROPBOX_TOKEN,
        process.env.DROPBOX_ACCESS_TOKEN
    ];

    for (const value of candidates) {
        if (value && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function normalizeChooserFile(file: DropboxChooserFile): ImportAsset {
    return {
        dropboxFileId: String(file.id),
        dropboxPath:
            typeof file.path_display === 'string' && file.path_display
                ? file.path_display
                : typeof file.path_lower === 'string' && file.path_lower
                  ? file.path_lower
                  : file.link,
        fileName: file.name,
        sizeInBytes: typeof file.bytes === 'number' ? file.bytes : 0,
        previewUrl: typeof file.link === 'string' ? file.link : undefined,
        thumbnailUrl: typeof file.thumbnailLink === 'string' ? file.thumbnailLink : undefined,
        link: typeof file.link === 'string' ? file.link : undefined,
        clientModified: typeof file.client_modified === 'string' ? file.client_modified : undefined,
        serverModified: typeof file.server_modified === 'string' ? file.server_modified : undefined
    };
}

function isFolderSelection(file: DropboxChooserFile): boolean {
    if (!file) {
        return false;
    }

    if (typeof file.isDir === 'boolean') {
        return file.isDir;
    }

    const tag = file['.tag'];
    if (typeof tag === 'string') {
        return tag.toLowerCase() === 'folder';
    }

    return false;
}

function normalizeListFolderFile(entry: DropboxListFolderEntry): ImportAsset {
    const dropboxFileId = typeof entry.id === 'string' ? entry.id : '';

    return {
        dropboxFileId,
        dropboxPath:
            (typeof entry.path_display === 'string' && entry.path_display) ||
            (typeof entry.path_lower === 'string' && entry.path_lower) ||
            dropboxFileId,
        fileName: typeof entry.name === 'string' ? entry.name : dropboxFileId,
        sizeInBytes: typeof entry.size === 'number' ? entry.size : 0,
        clientModified: typeof entry.client_modified === 'string' ? entry.client_modified : undefined,
        serverModified: typeof entry.server_modified === 'string' ? entry.server_modified : undefined
    };
}

function buildFolderRequestOptions(file: DropboxChooserFile): ListFolderRequest[] {
    const options: ListFolderRequest[] = [];
    const seen = new Set<string>();

    const pushOption = (option: ListFolderRequest) => {
        const key = `${option.path ?? ''}|${option.sharedLinkUrl ?? ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            options.push(option);
        }
    };

    if (typeof file.id === 'string' && file.id.trim()) {
        pushOption({ path: file.id.trim() });
    }

    if (typeof file.path_lower === 'string' && file.path_lower.trim()) {
        pushOption({ path: file.path_lower.trim() });
    }

    if (typeof file.path_display === 'string' && file.path_display.trim()) {
        pushOption({ path: file.path_display.trim() });
    }

    if (typeof file.link === 'string' && file.link.trim()) {
        pushOption({ path: '', sharedLinkUrl: file.link.trim() });
    }

    return options;
}

async function listDropboxFolderFiles({
    accessToken,
    path,
    sharedLinkUrl
}: ListFolderRequest & { accessToken: string }): Promise<DropboxListFolderEntry[]> {
    const entries: DropboxListFolderEntry[] = [];
    let endpoint = 'https://api.dropboxapi.com/2/files/list_folder';
    let body: Record<string, unknown> = {
        path: typeof path === 'string' ? path : '',
        recursive: true,
        include_media_info: false,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        include_non_downloadable_files: false
    };

    if (sharedLinkUrl) {
        body.shared_link = { url: sharedLinkUrl };
    }

    let hasMore = true;
    while (hasMore) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const details = await response.text();
            throw new Error(`Dropbox list_folder failed (${response.status}): ${details || response.statusText}`);
        }

        const payload = (await response.json()) as DropboxListFolderResponse;
        if (Array.isArray(payload.entries)) {
            for (const entry of payload.entries) {
                if (entry && entry['.tag'] === 'file') {
                    entries.push(entry);
                }
            }
        }

        hasMore = Boolean(payload.has_more);
        if (hasMore) {
            if (!payload.cursor) {
                break;
            }

            endpoint = 'https://api.dropboxapi.com/2/files/list_folder/continue';
            body = { cursor: payload.cursor };
        }
    }

    return entries;
}

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
    const [resultMessage, setResultMessage] = React.useState<string | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [folderPath, setFolderPath] = React.useState('');
    const [triggerZapier, setTriggerZapier] = React.useState(true);
    const dropboxAccessToken = React.useMemo(() => resolveDropboxAccessToken(), []);

    React.useEffect(() => {
        if (!selectedGalleryId && galleryOptions.length > 0) {
            setSelectedGalleryId(galleryOptions[0].value);
        }
    }, [galleryOptions, selectedGalleryId]);

    const selectedGallery = React.useMemo(
        () => galleryOptions.find((option) => option.value === selectedGalleryId) ?? null,
        [galleryOptions, selectedGalleryId]
    );

    const handleImport = React.useCallback(
        async (files: DropboxChooserFile[]) => {
            if (!selectedGalleryId) {
                setErrorMessage('Choose a gallery before importing Dropbox assets.');
                return;
            }

            if (!files || files.length === 0) {
                return;
            }

            setErrorMessage(null);
            setResultMessage(null);

            const assetsById = new Map<string, ImportAsset>();
            const folderSelections: DropboxChooserFile[] = [];

            for (const file of files) {
                if (!file) {
                    continue;
                }

                if (isFolderSelection(file)) {
                    folderSelections.push(file);
                } else {
                    const asset = normalizeChooserFile(file);
                    assetsById.set(asset.dropboxFileId, asset);
                }
            }

            if (folderSelections.length > 0 && !dropboxAccessToken) {
                setErrorMessage(
                    'Selecting Dropbox folders requires NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN. Update your environment or choose individual files.'
                );
                return;
            }

            setImporting(true);

            try {
                if (folderSelections.length > 0 && dropboxAccessToken) {
                    for (const folder of folderSelections) {
                        const options = buildFolderRequestOptions(folder);

                        if (options.length === 0) {
                            console.warn('Dropbox folder selection missing path information', folder);
                            continue;
                        }

                        let folderEntries: DropboxListFolderEntry[] | null = null;
                        let lastError: unknown = null;

                        for (const option of options) {
                            try {
                                folderEntries = await listDropboxFolderFiles({
                                    accessToken: dropboxAccessToken,
                                    path: option.path,
                                    sharedLinkUrl: option.sharedLinkUrl
                                });
                                break;
                            } catch (listingError) {
                                lastError = listingError;
                            }
                        }

                        if (!folderEntries) {
                            console.error('Unable to expand Dropbox folder selection', lastError || folder);
                            throw lastError instanceof Error
                                ? lastError
                                : new Error('Unable to list Dropbox folder contents.');
                        }

                        for (const entry of folderEntries) {
                            const asset = normalizeListFolderFile(entry);
                            if (asset.dropboxFileId) {
                                assetsById.set(asset.dropboxFileId, asset);
                            }
                        }
                    }
                }

                const assets = Array.from(assetsById.values());

                if (assets.length === 0) {
                    setErrorMessage('No Dropbox files were selected for import.');
                    return;
                }

                const response = await fetch('/api/galleries/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        galleryId: selectedGalleryId,
                        galleryName: selectedGallery?.label,
                        clientName: selectedGallery?.clientName,
                        folderPath: folderPath || null,
                        triggerZapier,
                        assets
                    })
                });

                const payload = (await response.json()) as ImportResponse;

                if (!response.ok) {
                    setErrorMessage(payload.error || 'Failed to import Dropbox assets.');
                    return;
                }

                const imported = payload.data?.imported ?? assets.length;
                const skipped = payload.data?.skipped ?? 0;
                setResultMessage(
                    `Imported ${imported} file${imported === 1 ? '' : 's'} from Dropbox${
                        skipped > 0 ? ` (${skipped} skipped as duplicates).` : '.'
                    }`
                );

                if (onImportComplete) {
                    onImportComplete({ imported, skipped });
                }
            } catch (error) {
                console.error('Dropbox import failed', error);
                if (error instanceof Error && /dropbox (folder|list_folder)/i.test(error.message)) {
                    setErrorMessage(
                        'Failed to load files from the selected Dropbox folder. Confirm Dropbox API access and try again.'
                    );
                } else {
                    setErrorMessage('Unexpected error while importing from Dropbox. Check console for details.');
                }
            } finally {
                setImporting(false);
            }
        },
        [
            dropboxAccessToken,
            folderPath,
            onImportComplete,
            selectedGallery,
            selectedGalleryId,
            triggerZapier
        ]
    );

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
                    Destination folder (optional)
                    <input
                        type="text"
                        value={folderPath}
                        onChange={(event) => setFolderPath(event.target.value)}
                        placeholder="/Clients/2025-05-14-sanders/"
                        className="rounded-xl border border-slate-300 bg-white/70 px-4 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
                    />
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-[#4DE5FF] focus:ring-[#4DE5FF] dark:border-slate-600"
                        checked={triggerZapier}
                        onChange={(event) => setTriggerZapier(event.target.checked)}
                    />
                    Trigger Zapier webhook for new imports
                </label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Launch the Dropbox Chooser to select hero images, proofing assets, or entire folders. The importer expands
                    folder selections automatically before writing everything to the Supabase
                    <code className="ml-1 rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">dropbox_assets</code> table with
                    duplicate detection and optional Zapier notifications.
                </p>
            </div>
            <div className="flex flex-col gap-4">
                <DropboxChooserButton onSelect={handleImport} disabled={importing} folderselect>
                    {importing ? 'Importing…' : 'Import from Dropbox'}
                </DropboxChooserButton>
                {resultMessage ? <p className="text-sm text-emerald-500">{resultMessage}</p> : null}
                {errorMessage ? <p className="text-sm text-rose-500">{errorMessage}</p> : null}
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                    <p className="font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Dropbox chooser tips</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>Select an entire gallery drop folder directly—the importer expands folders and queues every file.</li>
                        <li>Use the direct link option when you want clients to download the original file.</li>
                        <li>Preview URLs expire after a short period—Supabase stores them so the CRM can refresh as needed.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
