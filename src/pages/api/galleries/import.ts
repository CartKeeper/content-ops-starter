import type { NextApiRequest, NextApiResponse } from 'next';
import dayjs from 'dayjs';

import { getDropboxClient, type DropboxClient } from '../../../server/dropbox/client';
import type { DropboxFileMetadata } from '../../../types/dropbox';
import type { DropboxChooserFile } from '../../../types/dropbox-chooser';
import { collectAssetsFromSelection, type DropboxImportAsset } from '../../../utils/dropbox-import';
import { getSupabaseClient } from '../../../utils/supabase-client';

const ALLOWED_METHODS = ['POST'] as const;

const DROPBOX_STATUS = {
    synced: 'Synced',
    syncing: 'Syncing',
    pending: 'Pending',
    error: 'Error',
    archived: 'Archived'
} as const;

type ImportBody = {
    galleryId?: string;
    galleryName?: string | null;
    clientName?: string | null;
    folderPath?: string | null;
    triggerZapier?: boolean;
    assets?: ImportAssetPayload[];
    selection?: DropboxChooserFile[];
};

type ImportResponse = {
    data?: { imported: number; skipped: number };
    error?: string;
};

type ImportAssetRequest = {
    dropboxFileId?: string;
    dropboxPath?: string;
    fileName?: string;
};

type ImportAssetPayload = Partial<DropboxImportAsset> & ImportAssetRequest;

type ResolvedDropboxAsset = {
    dropboxFileId: string;
    dropboxPath: string;
    folderPath: string | null;
    fileName: string;
    sizeInBytes: number;
    clientModified: string | null;
    serverModified: string | null;
    contentHash: string | null;
};

function ensureArray<T>(value: unknown): T[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value as T[];
}

function normalizePath(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed.toLowerCase() : null;
}

function normalizeFolderPath(path: string | null | undefined): string | null {
    if (typeof path !== 'string') {
        return null;
    }

    const trimmed = path.trim();

    if (!trimmed) {
        return null;
    }

    if (trimmed === '/') {
        return '/';
    }

    return trimmed.replace(/\/+$/, '');
}

function getFolderFromPath(path: string | null | undefined): string | null {
    if (typeof path !== 'string') {
        return null;
    }

    const trimmed = path.trim();

    if (!trimmed) {
        return null;
    }

    const lastSlash = trimmed.lastIndexOf('/');

    if (lastSlash === -1) {
        return null;
    }

    if (lastSlash === 0) {
        return '/';
    }

    return normalizeFolderPath(trimmed.slice(0, lastSlash));
}

function buildPath(folderPath: string | null, fileName: string): string {
    const normalizedFolder = normalizeFolderPath(folderPath);

    if (!normalizedFolder || normalizedFolder === '/') {
        return `/${fileName}`;
    }

    return `${normalizedFolder}/${fileName}`;
}

function mapMetadataToAsset(metadata: DropboxFileMetadata, fallbackFolder: string | null): ResolvedDropboxAsset {
    const normalizedFallback = normalizeFolderPath(fallbackFolder);
    const canonicalPath =
        metadata.pathDisplay ?? metadata.pathLower ?? buildPath(normalizedFallback, metadata.name);

    const folderPath = getFolderFromPath(canonicalPath) ?? normalizedFallback;

    return {
        dropboxFileId: metadata.id,
        dropboxPath: canonicalPath,
        folderPath,
        fileName: metadata.name,
        sizeInBytes: typeof metadata.size === 'number' ? metadata.size : 0,
        clientModified: metadata.clientModified ?? null,
        serverModified: metadata.serverModified ?? null,
        contentHash: metadata.contentHash ?? null
    } satisfies ResolvedDropboxAsset;
}

function toDropboxListPath(folderPath: string | null): string {
    if (!folderPath || folderPath === '/') {
        return '';
    }

    return folderPath;
}

async function resolveDropboxAssets(
    dropbox: DropboxClient,
    requestedAssets: ImportAssetRequest[],
    fallbackFolderPath: string | null
): Promise<ResolvedDropboxAsset[]> {
    const normalizedFallback = normalizeFolderPath(fallbackFolderPath);
    const assets = Array.isArray(requestedAssets) ? requestedAssets : [];

    if (assets.length === 0) {
        if (!normalizedFallback) {
            return [];
        }

        const entries = await dropbox.listFolder(toDropboxListPath(normalizedFallback));
        return entries.map((entry) => mapMetadataToAsset(entry, normalizedFallback));
    }

    const grouped = new Map<string | null, ImportAssetRequest[]>();

    for (const asset of assets) {
        const folder = getFolderFromPath(asset.dropboxPath) ?? normalizedFallback;
        const existing = grouped.get(folder ?? null) ?? [];
        existing.push(asset);
        grouped.set(folder ?? null, existing);
    }

    const resolved: ResolvedDropboxAsset[] = [];

    for (const [folder, requests] of grouped.entries()) {
        const normalizedFolder = normalizeFolderPath(folder) ?? null;
        const entries = await dropbox.listFolder(toDropboxListPath(normalizedFolder));

        for (const asset of requests) {
            const byId = asset.dropboxFileId;
            const byPath = normalizePath(asset.dropboxPath);

            const entry = entries.find((item) => {
                if (byId && item.id === byId) {
                    return true;
                }

                if (byPath) {
                    const entryPath = normalizePath(item.pathLower) ?? normalizePath(item.pathDisplay);

                    if (entryPath === byPath) {
                        return true;
                    }
                }

                if (asset.fileName && item.name === asset.fileName) {
                    return true;
                }

                return false;
            });

            if (!entry) {
                continue;
            }

            resolved.push(mapMetadataToAsset(entry, normalizedFolder ?? normalizedFallback ?? null));
        }
    }

    const uniqueById = new Map<string, ResolvedDropboxAsset>();

    for (const asset of resolved) {
        uniqueById.set(asset.dropboxFileId, asset);
    }

    return Array.from(uniqueById.values());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ImportResponse>) {
    if (!ALLOWED_METHODS.includes(req.method as (typeof ALLOWED_METHODS)[number])) {
        res.setHeader('Allow', ALLOWED_METHODS);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    try {
        const body: ImportBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as ImportBody);
        const galleryId = typeof body.galleryId === 'string' ? body.galleryId : null;
        const galleryName = typeof body.galleryName === 'string' ? body.galleryName : null;
        const clientName = typeof body.clientName === 'string' ? body.clientName : null;
        const folderPath = typeof body.folderPath === 'string' ? body.folderPath : null;
        const triggerZapier = body.triggerZapier !== false;
        const assetCandidates = ensureArray<ImportAssetPayload>(body.assets);
        const chooserSelection = ensureArray<DropboxChooserFile>(body.selection);

        const assetsByKey = new Map<string, ImportAssetRequest>();

        for (const asset of assetCandidates) {
            if (!asset) {
                continue;
            }

            const dropboxFileId =
                typeof asset.dropboxFileId === 'string' && asset.dropboxFileId.trim().length > 0
                    ? asset.dropboxFileId.trim()
                    : undefined;
            const dropboxPath =
                typeof asset.dropboxPath === 'string' && asset.dropboxPath.trim().length > 0
                    ? asset.dropboxPath.trim()
                    : undefined;
            const fileName =
                typeof asset.fileName === 'string' && asset.fileName.trim().length > 0 ? asset.fileName.trim() : undefined;

            const key = dropboxFileId ?? dropboxPath;
            if (!key) {
                continue;
            }

            assetsByKey.set(key, { dropboxFileId, dropboxPath, fileName });
        }

        if (chooserSelection.length > 0) {
            const accessToken =
                process.env.DROPBOX_ACCESS_TOKEN ??
                process.env.NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN ??
                process.env.NEXT_PUBLIC_DROPBOX_TOKEN ??
                null;

            try {
                const expandedAssets = await collectAssetsFromSelection({
                    selection: chooserSelection,
                    accessToken
                });

                for (const asset of expandedAssets) {
                    if (!asset) {
                        continue;
                    }

                    const dropboxFileId =
                        typeof asset.dropboxFileId === 'string' && asset.dropboxFileId.trim().length > 0
                            ? asset.dropboxFileId.trim()
                            : undefined;
                    const dropboxPath =
                        typeof asset.dropboxPath === 'string' && asset.dropboxPath.trim().length > 0
                            ? asset.dropboxPath.trim()
                            : undefined;
                    const fileName =
                        typeof asset.fileName === 'string' && asset.fileName.trim().length > 0
                            ? asset.fileName.trim()
                            : undefined;

                    const key = dropboxFileId ?? dropboxPath;
                    if (!key) {
                        continue;
                    }

                    assetsByKey.set(key, { dropboxFileId, dropboxPath, fileName });
                }
            } catch (error) {
                console.error('Failed to expand Dropbox selection', error);

                if (!accessToken) {
                    res.status(400).json({
                        error:
                            'Selecting Dropbox folders requires DROPBOX_ACCESS_TOKEN or NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN in the environment.'
                    });
                } else {
                    res.status(502).json({
                        error: 'Failed to load files from the selected Dropbox folder. Confirm Dropbox API access and try again.'
                    });
                }
                return;
            }
        }

        const requestedAssets = Array.from(assetsByKey.values());

        if (!galleryId) {
            res.status(400).json({ error: 'galleryId is required to import Dropbox assets.' });
            return;
        }

        const dropbox = getDropboxClient();
        const resolvedAssets = await resolveDropboxAssets(dropbox, requestedAssets, folderPath);

        if (resolvedAssets.length === 0) {
            res.status(400).json({ error: 'Unable to resolve Dropbox files for import. Confirm the folder path and try again.' });
            return;
        }

        const supabase = getSupabaseClient();
        const timestamp = dayjs().toISOString();

        const records = resolvedAssets.map((asset) => ({
            dropbox_file_id: asset.dropboxFileId,
            dropbox_path: asset.dropboxPath,
            folder_path: asset.folderPath ?? folderPath,
            file_name: asset.fileName,
            size_in_bytes: asset.sizeInBytes,
            preview_url: null,
            thumbnail_url: null,
            client_name: clientName,
            gallery_id: galleryId,
            gallery_name: galleryName,
            status: DROPBOX_STATUS.synced,
            client_modified: asset.clientModified,
            server_modified: asset.serverModified,
            imported_at: timestamp
        }));

        const { data, error } = await supabase
            .from('dropbox_assets')
            .upsert(records, { onConflict: 'dropbox_file_id' })
            .select('id, dropbox_file_id');

        if (error) {
            console.error('Failed to import Dropbox assets', error);
            res.status(500).json({ error: 'Unable to persist Dropbox assets.' });
            return;
        }

        const imported = data?.length ?? 0;
        const skipped = resolvedAssets.length - imported;

        if (triggerZapier) {
            await supabase.from('zapier_webhook_events').insert({
                event_type: 'gallery.imported',
                status: 'processed',
                payload: {
                    event: 'gallery.imported',
                    galleryId,
                    galleryName,
                    clientName,
                    importedAt: timestamp,
                    requestedAssetCount: requestedAssets.length,
                    resolvedAssetCount: resolvedAssets.length,
                    assets: resolvedAssets.map((asset) => ({
                        dropboxFileId: asset.dropboxFileId,
                        dropboxPath: asset.dropboxPath,
                        fileName: asset.fileName,
                        sizeInBytes: asset.sizeInBytes,
                        clientModified: asset.clientModified,
                        serverModified: asset.serverModified,
                        contentHash: asset.contentHash
                    }))
                },
                received_at: timestamp
            });
        }

        res.status(200).json({ data: { imported, skipped } });
    } catch (error) {
        console.error('Unhandled Dropbox import error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
