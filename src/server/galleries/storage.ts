import { createHash, randomUUID, type BinaryLike } from 'crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { GalleryAsset } from '../../data/crm';

const DEFAULT_BUCKET = process.env.SUPABASE_GALLERY_BUCKET || 'galleries';

type StoreGalleryAssetParams = {
    buffer: Buffer;
    fileName: string;
    supabase: SupabaseClient;
    contentType?: string | null;
    size?: number | null;
    clientId?: string | null;
    projectCode?: string | null;
    dropboxFileId?: string | null;
    dropboxRevision?: string | null;
    source?: 'uploader' | 'dropbox-webhook';
};

type SupabaseAssetRecord = {
    id: string;
    client_id: string | null;
    project_code: string | null;
    file_name: string;
    content_type: string | null;
    size_bytes: number | null;
    storage_bucket: string | null;
    storage_path: string | null;
    public_url: string | null;
    checksum: string | null;
    duplicate_of: string | null;
    uploaded_at?: string | null;
    created_at?: string | null;
    dropbox_file_id?: string | null;
    dropbox_revision?: string | null;
};

function slugify(value: string | null | undefined): string {
    if (!value) {
        return 'unassigned';
    }

    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 60) || 'unassigned';
}

function sanitizeFileName(value: string): string {
    const trimmed = value.trim().replace(/[^a-zA-Z0-9_.-]/g, '-');
    return trimmed || `asset-${randomUUID()}`;
}

async function resolvePublicUrl(
    supabase: SupabaseClient,
    bucket: string,
    path: string | null | undefined
): Promise<string> {
    if (!path) {
        return '';
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? '';
}

export async function ensureGalleryBucket(
    supabase: SupabaseClient,
    bucket: string = DEFAULT_BUCKET
): Promise<void> {
    const { data, error } = await supabase.storage.getBucket(bucket);

    if (data || !error) {
        return;
    }

    if (error && error.message && /not found|does not exist/i.test(error.message)) {
        const { error: createError } = await supabase.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: `${1024 * 1024 * 200}` // 200 MB default cap
        });

        if (createError && !/already exists/i.test(createError.message ?? '')) {
            throw createError;
        }
    } else if (error && !/already exists/i.test(error.message)) {
        throw error;
    }
}

function normalizeAssetRecord(record: SupabaseAssetRecord, bucketFallback: string): GalleryAsset {
    const size = Number(record.size_bytes ?? 0);
    const bucketId = record.storage_bucket || bucketFallback;
    const publicUrl = record.public_url ?? '';

    return {
        id: record.id,
        fileName: record.file_name ?? 'untitled',
        contentType: record.content_type ?? 'application/octet-stream',
        size: Number.isFinite(size) ? size : 0,
        storageBucket: bucketId,
        storagePath: record.storage_path ?? '',
        publicUrl,
        checksum: record.checksum ?? null,
        uploadedAt: record.uploaded_at ?? record.created_at ?? undefined,
        duplicateOf: record.duplicate_of ?? null,
        isDuplicate: Boolean(record.duplicate_of),
        clientId: record.client_id ?? null,
        projectCode: record.project_code ?? null,
        dropboxFileId: record.dropbox_file_id ?? null,
        dropboxRevision: record.dropbox_revision ?? null
    };
}

async function findDuplicate(
    supabase: SupabaseClient,
    checksum: string,
    clientId: string | null | undefined,
    projectCode: string | null | undefined
): Promise<SupabaseAssetRecord | null> {
    let query = supabase.from('crm_gallery_assets').select('*').eq('checksum', checksum).limit(1);

    query = clientId ? query.eq('client_id', clientId) : query.is('client_id', null);
    query = projectCode ? query.eq('project_code', projectCode) : query.is('project_code', null);

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return (data as SupabaseAssetRecord | null) ?? null;
}

export async function storeGalleryAsset({
    buffer,
    fileName,
    supabase,
    contentType,
    size,
    clientId,
    projectCode,
    dropboxFileId,
    dropboxRevision,
    source
}: StoreGalleryAssetParams): Promise<{ asset: GalleryAsset; duplicate: boolean }> {
    const bucketId = DEFAULT_BUCKET;
    await ensureGalleryBucket(supabase, bucketId);

    const actualSize = typeof size === 'number' && Number.isFinite(size) ? size : buffer.byteLength;
    const checksumInput = buffer as unknown as BinaryLike;
    const checksum = createHash('sha1').update(checksumInput).digest('hex');
    const duplicate = await findDuplicate(supabase, checksum, clientId ?? null, projectCode ?? null);

    if (duplicate) {
        const normalized = normalizeAssetRecord(duplicate, bucketId);
        if (!normalized.publicUrl) {
            normalized.publicUrl = await resolvePublicUrl(supabase, normalized.storageBucket, duplicate.storage_path);
        }
        normalized.isDuplicate = true;
        normalized.duplicateOf = duplicate.duplicate_of ?? duplicate.id;

        await supabase
            .from('crm_gallery_assets')
            .update({
                dropbox_file_id: dropboxFileId ?? duplicate.dropbox_file_id ?? null,
                dropbox_revision: dropboxRevision ?? duplicate.dropbox_revision ?? null
            })
            .eq('id', duplicate.id);

        return { asset: normalized, duplicate: true };
    }

    const folderClient = slugify(clientId);
    const folderProject = slugify(projectCode);
    const cleanedName = sanitizeFileName(fileName);
    const uniqueName = `${Date.now()}-${randomUUID()}-${cleanedName}`;
    const storagePath = [folderClient, folderProject, uniqueName].filter(Boolean).join('/');
    const uploadContentType = contentType || 'application/octet-stream';

    const { error: uploadError } = await supabase.storage.from(bucketId).upload(storagePath, buffer, {
        contentType: uploadContentType,
        upsert: false
    });

    if (uploadError) {
        throw uploadError;
    }

    const publicUrl = await resolvePublicUrl(supabase, bucketId, storagePath);
    const assetId = randomUUID();

    const payload = {
        id: assetId,
        client_id: clientId ?? null,
        project_code: projectCode ?? null,
        file_name: fileName,
        content_type: uploadContentType,
        size_bytes: actualSize,
        storage_bucket: bucketId,
        storage_path: storagePath,
        public_url: publicUrl,
        checksum,
        dropbox_file_id: dropboxFileId ?? null,
        dropbox_revision: dropboxRevision ?? null,
        duplicate_of: null,
        uploaded_at: new Date().toISOString(),
        source: source ?? 'uploader'
    } as Record<string, unknown>;

    // Remove "source" if the column does not exist to avoid supabase errors.
    const { error: insertError, data } = await supabase
        .from('crm_gallery_assets')
        .insert([payload])
        .select()
        .single();

    if (insertError) {
        // Retry without metadata keys that might not exist.
        if (/column\s+source/i.test(insertError.message ?? '')) {
            const fallbackPayload = { ...payload };
            delete fallbackPayload.source;
            const { error: retryError, data: retryData } = await supabase
                .from('crm_gallery_assets')
                .insert([fallbackPayload])
                .select()
                .single();

            if (retryError) {
                throw retryError;
            }

            const normalizedRetry = normalizeAssetRecord(
                retryData as unknown as SupabaseAssetRecord,
                bucketId
            );
            normalizedRetry.publicUrl = normalizedRetry.publicUrl || publicUrl;
            return { asset: normalizedRetry, duplicate: false };
        }

        throw insertError;
    }

    const normalized = normalizeAssetRecord(data as unknown as SupabaseAssetRecord, bucketId);
    normalized.publicUrl = normalized.publicUrl || publicUrl;

    return { asset: normalized, duplicate: false };
}

export async function attachAssetsToGallery(
    supabase: SupabaseClient,
    galleryId: string,
    assetIds: string[]
): Promise<void> {
    if (assetIds.length === 0) {
        return;
    }

    const { error } = await supabase
        .from('crm_gallery_assets')
        .update({ gallery_id: galleryId })
        .in('id', assetIds);

    if (error && !/column\s+gallery_id/i.test(error.message ?? '')) {
        throw error;
    }
}
