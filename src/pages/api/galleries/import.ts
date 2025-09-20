import type { NextApiRequest, NextApiResponse } from 'next';
import dayjs from 'dayjs';

import { getSupabaseClient } from '../../../utils/supabase-client';

const DROPBOX_DOWNLOAD_ENDPOINT = 'https://content.dropboxapi.com/2/files/download';
const DROPBOX_STORAGE_BUCKET = 'dropbox_assets';

const ALLOWED_METHODS = ['POST'] as const;

const DROPBOX_STATUS = {
    synced: 'Synced',
    syncing: 'Syncing',
    pending: 'Pending',
    error: 'Error',
    archived: 'Archived'
} as const;

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

type ImportBody = {
    galleryId?: string;
    galleryName?: string | null;
    clientName?: string | null;
    folderPath?: string | null;
    triggerZapier?: boolean;
    assets?: ImportAsset[];
};

type ImportResponse = {
    data?: { imported: number; skipped: number };
    error?: string;
};

function ensureArray<T>(value: unknown): T[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value as T[];
}

function sanitizeSegment(value: string | null | undefined): string | null {
    if (!value || typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
    if (!trimmed) {
        return null;
    }

    return trimmed.replace(/[^A-Za-z0-9._-]+/g, '-');
}

function sanitizeFileName(fileName: string | null | undefined, fallback: string): string {
    if (!fileName || typeof fileName !== 'string') {
        return fallback;
    }

    const parsed = fileName.trim();
    if (!parsed) {
        return fallback;
    }

    const lastDot = parsed.lastIndexOf('.');
    const base = lastDot > 0 ? parsed.slice(0, lastDot) : parsed;
    const extension = lastDot > 0 ? parsed.slice(lastDot + 1) : '';

    const safeBase = sanitizeSegment(base) ?? 'file';
    const safeExtension = extension.replace(/[^A-Za-z0-9]+/g, '');

    return safeExtension ? `${safeBase}.${safeExtension}` : safeBase;
}

function buildStoragePath({
    galleryId,
    folderPath,
    asset
}: {
    galleryId: string;
    folderPath: string | null;
    asset: ImportAsset;
}): string {
    const segments: string[] = [];

    const gallerySegment = sanitizeSegment(galleryId) ?? 'unassigned';
    segments.push(gallerySegment);

    const dropboxFolder = asset.dropboxPath.includes('/')
        ? asset.dropboxPath.slice(0, asset.dropboxPath.lastIndexOf('/'))
        : '';
    const candidateFolder = folderPath ?? dropboxFolder;
    if (candidateFolder) {
        candidateFolder
            .split('/')
            .map((part) => sanitizeSegment(part))
            .filter((part): part is string => Boolean(part))
            .forEach((part) => segments.push(part));
    }

    const fileIdSegment = sanitizeSegment(asset.dropboxFileId.replace(/^id:/, ''));
    if (fileIdSegment) {
        segments.push(fileIdSegment);
    }

    const safeFileName = sanitizeFileName(
        asset.fileName,
        fileIdSegment ? `${fileIdSegment}.bin` : 'dropbox-asset.bin'
    );
    segments.push(safeFileName);

    return segments.join('/');
}

async function downloadDropboxAsset(
    accessToken: string,
    asset: ImportAsset
): Promise<{ buffer: Buffer; metadata: Record<string, unknown> | null; contentType: string }> {
    const pathArg = asset.dropboxPath && asset.dropboxPath.trim().length > 0
        ? asset.dropboxPath
        : asset.dropboxFileId;

    const response = await fetch(DROPBOX_DOWNLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({ path: pathArg })
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `Dropbox download failed for ${asset.dropboxFileId} with status ${response.status}: ${errorText}`
        );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const metadataHeader = response.headers.get('dropbox-api-result');
    let metadata: Record<string, unknown> | null = null;
    if (metadataHeader) {
        try {
            metadata = JSON.parse(metadataHeader) as Record<string, unknown>;
        } catch (parseError) {
            console.warn('Failed to parse Dropbox metadata header', parseError);
        }
    }

    const contentType =
        response.headers.get('content-type') ??
        (metadata && typeof metadata === 'object' && typeof metadata['mime_type'] === 'string'
            ? (metadata['mime_type'] as string)
            : 'application/octet-stream');

    return { buffer, metadata, contentType };
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
        const assets = ensureArray<ImportAsset>(body.assets).filter((asset) => typeof asset?.dropboxFileId === 'string');

        if (!galleryId) {
            res.status(400).json({ error: 'galleryId is required to import Dropbox assets.' });
            return;
        }

        if (assets.length === 0) {
            res.status(400).json({ error: 'Provide at least one Dropbox asset to import.' });
            return;
        }

        const supabase = getSupabaseClient();
        const timestamp = dayjs().toISOString();

        const dropboxAccessToken =
            process.env.DROPBOX_ACCESS_TOKEN ??
            process.env.DROPBOX_API_TOKEN ??
            process.env.DROPBOX_OAUTH_TOKEN ??
            null;

        if (!dropboxAccessToken) {
            res.status(500).json({
                error: 'Missing Dropbox access token. Provide DROPBOX_ACCESS_TOKEN for binary downloads.'
            });
            return;
        }

        const storageClient = supabase.storage.from(DROPBOX_STORAGE_BUCKET);

        const records: {
            dropbox_file_id: string;
            dropbox_path: string;
            folder_path: string | null;
            file_name: string;
            size_in_bytes: number | null;
            preview_url: string | null;
            thumbnail_url: string | null;
            client_name: string | null;
            gallery_id: string | null;
            gallery_name: string | null;
            status: string;
            client_modified: string | null;
            server_modified: string | null;
            imported_at: string;
            storage_bucket: string | null;
            storage_path: string | null;
            payload: Record<string, unknown> | null;
        }[] = [];

        const failures: { asset: ImportAsset; error: unknown }[] = [];

        for (const asset of assets) {
            const baseRecord = {
                dropbox_file_id: asset.dropboxFileId,
                dropbox_path: asset.dropboxPath,
                folder_path: folderPath,
                file_name: asset.fileName,
                thumbnail_url: asset.thumbnailUrl ?? null,
                client_name: clientName,
                gallery_id: galleryId,
                gallery_name: galleryName,
                client_modified: asset.clientModified ?? null,
                server_modified: asset.serverModified ?? null,
                imported_at: timestamp
            } as const;

            try {
                const { buffer, metadata, contentType } = await downloadDropboxAsset(
                    dropboxAccessToken,
                    asset
                );

                const storagePath = buildStoragePath({ galleryId, folderPath, asset });
                const uploadBody = buffer.buffer.slice(
                    buffer.byteOffset,
                    buffer.byteOffset + buffer.byteLength
                );

                const uploadResult = await storageClient.upload(storagePath, uploadBody, {
                    contentType,
                    upsert: true
                });

                if (uploadResult.error) {
                    throw uploadResult.error;
                }

                const publicUrlResult = storageClient.getPublicUrl(storagePath);
                const publicUrl = publicUrlResult.data?.publicUrl ?? null;

                const metadataSize =
                    metadata && typeof metadata.size === 'number'
                        ? Number(metadata.size)
                        : metadata && typeof metadata.size === 'string'
                            ? Number.parseInt(metadata.size, 10)
                            : null;

                const resolvedSize =
                    Number.isFinite(metadataSize) && metadataSize
                        ? metadataSize
                        : buffer.byteLength || asset.sizeInBytes || null;

                const payload =
                    metadata || asset.previewUrl || asset.link
                        ? {
                              dropboxMetadata: metadata ?? null,
                              dropboxPreviewUrl: asset.previewUrl ?? asset.link ?? null
                          }
                        : null;

                records.push({
                    ...baseRecord,
                    size_in_bytes: resolvedSize,
                    preview_url: publicUrl ?? asset.previewUrl ?? asset.link ?? null,
                    status: DROPBOX_STATUS.synced,
                    storage_bucket: DROPBOX_STORAGE_BUCKET,
                    storage_path: storagePath,
                    payload
                });
            } catch (assetError) {
                console.error('Failed to mirror Dropbox asset to Supabase storage', {
                    dropboxFileId: asset.dropboxFileId,
                    dropboxPath: asset.dropboxPath,
                    error: assetError
                });
                failures.push({ asset, error: assetError });

                records.push({
                    ...baseRecord,
                    size_in_bytes: asset.sizeInBytes ?? null,
                    preview_url: asset.previewUrl ?? asset.link ?? null,
                    status: DROPBOX_STATUS.error,
                    storage_bucket: null,
                    storage_path: null,
                    payload:
                        assetError instanceof Error
                            ? { error: assetError.message }
                            : { error: 'Unable to sync Dropbox asset to storage.' }
                });
            }
        }

        const { error } = await supabase
            .from('dropbox_assets')
            .upsert(records, { onConflict: 'dropbox_file_id' })
            .select('id, dropbox_file_id, status');

        if (error) {
            console.error('Failed to import Dropbox assets', error);
            res.status(500).json({ error: 'Unable to persist Dropbox assets.' });
            return;
        }

        const imported = records.filter((record) => record.status === DROPBOX_STATUS.synced).length;
        const skipped = assets.length - imported;

        if (triggerZapier) {
            const zapierAssets = records.map((record) => ({
                dropboxFileId: record.dropbox_file_id,
                dropboxPath: record.dropbox_path,
                fileName: record.file_name,
                sizeInBytes: record.size_in_bytes,
                status: record.status,
                storageBucket: record.storage_bucket,
                storagePath: record.storage_path,
                previewUrl: record.preview_url,
                thumbnailUrl: record.thumbnail_url,
                error: (record.payload as { error?: string } | null)?.error
            }));

            await supabase.from('zapier_webhook_events').insert({
                event_type: 'gallery.imported',
                status: 'processed',
                payload: {
                    event: 'gallery.imported',
                    galleryId,
                    galleryName,
                    clientName,
                    importedAt: timestamp,
                    assets: zapierAssets
                },
                received_at: timestamp
            });
        }

        if (failures.length > 0) {
            const failureSummary = failures
                .map((entry) => entry.asset.dropboxFileId)
                .join(', ');
            res.status(207).json({
                data: { imported, skipped },
                error: `Some assets failed to sync: ${failureSummary}`
            });
            return;
        }

        res.status(200).json({ data: { imported, skipped } });
    } catch (error) {
        console.error('Unhandled Dropbox import error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
