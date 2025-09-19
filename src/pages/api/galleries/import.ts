import type { NextApiRequest, NextApiResponse } from 'next';
import dayjs from 'dayjs';

import { getSupabaseClient } from '../../../utils/supabase-client';

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

        const records = assets.map((asset) => ({
            dropbox_file_id: asset.dropboxFileId,
            dropbox_path: asset.dropboxPath,
            folder_path: folderPath,
            file_name: asset.fileName,
            size_in_bytes: asset.sizeInBytes,
            preview_url: asset.previewUrl ?? asset.link ?? null,
            thumbnail_url: asset.thumbnailUrl ?? null,
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
        const skipped = assets.length - imported;

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
                    assets: assets.map((asset) => ({
                        dropboxFileId: asset.dropboxFileId,
                        dropboxPath: asset.dropboxPath,
                        fileName: asset.fileName,
                        sizeInBytes: asset.sizeInBytes,
                        previewUrl: asset.previewUrl ?? asset.link ?? null,
                        thumbnailUrl: asset.thumbnailUrl ?? null
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
