export type ZapierWebhookStatus = 'received' | 'processed' | 'failed';

export type ZapierWebhookEventRecord = {
    id: string;
    zap_id?: string | null;
    event_type?: string | null;
    status: ZapierWebhookStatus;
    received_at?: string | null;
    processed_at?: string | null;
    error_message?: string | null;
    payload?: Record<string, unknown> | null;
    headers?: Record<string, unknown> | null;
};

export type GalleryPublishedPayload = {
    event: 'gallery.published';
    galleryId: string;
    galleryName: string;
    clientId?: string | null;
    clientName?: string | null;
    publishUrl?: string | null;
    publishedAt: string;
    deliveryDueDate?: string | null;
    expiresAt?: string | null;
    assetCount?: number;
    totalBytes?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
};

export type GalleryImportPayload = {
    event: 'gallery.imported';
    galleryId: string;
    galleryName: string;
    clientId?: string | null;
    clientName?: string | null;
    importedAt: string;
    assets: Array<{
        dropboxFileId: string;
        dropboxPath: string;
        fileName: string;
        sizeInBytes: number;
        previewUrl?: string | null;
        thumbnailUrl?: string | null;
    }>;
};

export type ZapierWebhookPayload = GalleryPublishedPayload | GalleryImportPayload | Record<string, unknown>;
