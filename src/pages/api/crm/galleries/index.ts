import { randomUUID } from 'crypto';

import type { NextApiRequest, NextApiResponse } from 'next';

import type { GalleryAsset, GalleryRecord } from '../../../../data/crm';
import { attachAssetsToGallery } from '../../../../server/galleries/storage';
import { formatBytes, sumBytes } from '../../../../utils/format-bytes';
import { getSupabaseClient } from '../../../../utils/supabase-client';

type GalleriesResponse = {
    data?: GalleryRecord | GalleryRecord[];
    error?: string;
};

type RawGalleryRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeAsset(value: unknown): GalleryAsset | null {
    if (!isPlainObject(value)) {
        return null;
    }

    const sizeRaw = value.size ?? value.size_bytes ?? value.sizeBytes;
    const size = typeof sizeRaw === 'number' && Number.isFinite(sizeRaw) ? sizeRaw : 0;

    return {
        id: typeof value.id === 'string' ? value.id : randomUUID(),
        fileName: typeof value.fileName === 'string' ? value.fileName : String(value.file_name ?? 'asset'),
        contentType:
            typeof value.contentType === 'string'
                ? value.contentType
                : typeof value.content_type === 'string'
                  ? value.content_type
                  : 'application/octet-stream',
        size,
        storageBucket:
            typeof value.storageBucket === 'string'
                ? value.storageBucket
                : typeof value.storage_bucket === 'string'
                  ? value.storage_bucket
                  : 'galleries',
        storagePath:
            typeof value.storagePath === 'string'
                ? value.storagePath
                : typeof value.storage_path === 'string'
                  ? value.storage_path
                  : '',
        publicUrl:
            typeof value.publicUrl === 'string'
                ? value.publicUrl
                : typeof value.public_url === 'string'
                  ? value.public_url
                  : '',
        checksum: typeof value.checksum === 'string' ? value.checksum : null,
        uploadedAt:
            typeof value.uploadedAt === 'string'
                ? value.uploadedAt
                : typeof value.uploaded_at === 'string'
                  ? value.uploaded_at
                  : undefined,
        duplicateOf:
            typeof value.duplicateOf === 'string'
                ? value.duplicateOf
                : typeof value.duplicate_of === 'string'
                  ? value.duplicate_of
                  : null,
        isDuplicate: Boolean(value.isDuplicate ?? value.duplicate_of),
        clientId:
            typeof value.clientId === 'string'
                ? value.clientId
                : typeof value.client_id === 'string'
                  ? value.client_id
                  : null,
        projectCode:
            typeof value.projectCode === 'string'
                ? value.projectCode
                : typeof value.project_code === 'string'
                  ? value.project_code
                  : null,
        dropboxFileId:
            typeof value.dropboxFileId === 'string'
                ? value.dropboxFileId
                : typeof value.dropbox_file_id === 'string'
                  ? value.dropbox_file_id
                  : null,
        dropboxRevision:
            typeof value.dropboxRevision === 'string'
                ? value.dropboxRevision
                : typeof value.dropbox_revision === 'string'
                  ? value.dropbox_revision
                  : null
    } satisfies GalleryAsset;
}

function normalizeGallery(record: RawGalleryRecord): GalleryRecord {
    const assetsRaw = Array.isArray(record.assets) ? record.assets : [];
    const assets = assetsRaw.map((asset) => normalizeAsset(asset)).filter((asset): asset is GalleryAsset => Boolean(asset));
    const totalBytesRaw = record.total_storage_bytes ?? record.totalStorageBytes;
    const totalBytes = typeof totalBytesRaw === 'number' ? totalBytesRaw : sumBytes(assets.map((asset) => asset.size));
    const formatted = formatBytes(totalBytes);

    const coverImage =
        typeof record.cover_image === 'string'
            ? record.cover_image
            : typeof record.coverImage === 'string'
              ? record.coverImage
              : assets[0]?.publicUrl;

    return {
        id: typeof record.id === 'string' ? record.id : randomUUID(),
        client: typeof record.client === 'string' ? record.client : 'New client',
        shootType:
            typeof record.shoot_type === 'string'
                ? record.shoot_type
                : typeof record.shootType === 'string'
                  ? record.shootType
                  : 'New collection',
        projectCode:
            typeof record.project_code === 'string'
                ? record.project_code
                : typeof record.projectCode === 'string'
                  ? record.projectCode
                  : null,
        deliveryDueDate:
            typeof record.delivery_due_date === 'string'
                ? record.delivery_due_date
                : typeof record.deliveryDueDate === 'string'
                  ? record.deliveryDueDate
                  : undefined,
        deliveredAt:
            typeof record.delivered_at === 'string'
                ? record.delivered_at
                : typeof record.deliveredAt === 'string'
                  ? record.deliveredAt
                  : undefined,
        status: (record.status as GalleryRecord['status']) ?? 'Pending',
        coverImage,
        assets,
        totalStorageBytes: totalBytes,
        totalStorageFormatted: formatted,
        storageSummary: {
            assetCount: assets.length,
            totalBytes,
            formattedTotal: formatted
        },
        dropboxSyncCursor:
            typeof record.dropbox_sync_cursor === 'string'
                ? record.dropbox_sync_cursor
                : typeof record.dropboxSyncCursor === 'string'
                  ? record.dropboxSyncCursor
                  : null,
        dropboxFiles: Array.isArray(record.dropbox_files) ? (record.dropbox_files as string[]) : undefined,
        customFields: isPlainObject(record.custom_fields) ? (record.custom_fields as Record<string, string | boolean>) : undefined
    } satisfies GalleryRecord;
}

function parseBody(req: NextApiRequest): Record<string, unknown> | null {
    if (!req.body) {
        return null;
    }

    if (typeof req.body === 'string') {
        try {
            const parsed = JSON.parse(req.body);
            return isPlainObject(parsed) ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    return isPlainObject(req.body) ? req.body : null;
}

async function handleGet(req: NextApiRequest, res: NextApiResponse<GalleriesResponse>): Promise<void> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('crm_galleries').select('*').order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch galleries', error);
        res.status(500).json({ error: error.message || 'Unable to load galleries.' });
        return;
    }

    const normalized = Array.isArray(data) ? data.map((record) => normalizeGallery(record as RawGalleryRecord)) : [];
    res.status(200).json({ data: normalized });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse<GalleriesResponse>): Promise<void> {
    const body = parseBody(req);

    if (!body) {
        res.status(400).json({ error: 'Request body must be a JSON object.' });
        return;
    }

    const clientName = typeof body.client === 'string' && body.client.trim() ? body.client.trim() : 'New client';
    const shootType = typeof body.shootType === 'string' && body.shootType.trim() ? body.shootType.trim() : 'Untitled gallery';
    const status = typeof body.status === 'string' ? body.status : 'Pending';
    const projectCode = typeof body.projectCode === 'string' ? body.projectCode.trim() || null : null;

    const assetsInput = Array.isArray(body.assets) ? body.assets : [];
    const assets = assetsInput.map((asset) => normalizeAsset(asset)).filter((asset): asset is GalleryAsset => Boolean(asset));

    if (assets.length === 0) {
        res.status(400).json({ error: 'Upload at least one asset before creating a gallery.' });
        return;
    }

    const galleryId = typeof body.id === 'string' && body.id ? body.id : randomUUID();
    const deliveryDueDate = typeof body.deliveryDueDate === 'string' ? body.deliveryDueDate : undefined;
    const deliveredAt = typeof body.deliveredAt === 'string' ? body.deliveredAt : undefined;
    const dropboxSyncCursor = typeof body.dropboxSyncCursor === 'string' ? body.dropboxSyncCursor : null;
    const customFields = isPlainObject(body.customFields) ? body.customFields : null;

    const totalBytes = sumBytes(assets.map((asset) => asset.size));
    const coverImage =
        typeof body.coverImage === 'string' && body.coverImage.trim() ? body.coverImage : assets[0]?.publicUrl ?? null;
    const now = new Date().toISOString();

    const supabasePayload: Record<string, unknown> = {
        id: galleryId,
        client: clientName,
        shoot_type: shootType,
        status,
        project_code: projectCode,
        delivery_due_date: deliveryDueDate ?? null,
        delivered_at: deliveredAt ?? null,
        cover_image: coverImage,
        total_storage_bytes: totalBytes,
        asset_count: assets.length,
        dropbox_sync_cursor: dropboxSyncCursor,
        custom_fields: customFields,
        assets,
        created_at: now,
        updated_at: now
    };

    const supabase = getSupabaseClient();
    let insertResponse = await supabase.from('crm_galleries').insert([supabasePayload]).select().single();

    if (insertResponse.error && /column\s+asset_count/i.test(insertResponse.error.message ?? '')) {
        const fallbackPayload = { ...supabasePayload };
        delete fallbackPayload.asset_count;
        insertResponse = await supabase.from('crm_galleries').insert([fallbackPayload]).select().single();
    }

    if (insertResponse.error) {
        console.error('Failed to create gallery', insertResponse.error);
        res.status(500).json({ error: insertResponse.error.message || 'Unable to save gallery.' });
        return;
    }

    const record = normalizeGallery(insertResponse.data as RawGalleryRecord);

    await attachAssetsToGallery(
        supabase,
        record.id,
        assets.map((asset) => asset.id).filter((id): id is string => Boolean(id))
    );

    res.status(201).json({ data: record });
}

export default async function galleriesHandler(
    req: NextApiRequest,
    res: NextApiResponse<GalleriesResponse>
): Promise<void> {
    try {
        if (req.method === 'GET') {
            await handleGet(req, res);
            return;
        }

        if (req.method === 'POST') {
            await handlePost(req, res);
            return;
        }

        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    } catch (error) {
        console.error('Unhandled galleries API error', error);
        const message = error instanceof Error ? error.message : 'Unexpected error';
        res.status(500).json({ error: message });
    }
}
