import type { NextApiRequest, NextApiResponse } from 'next';

import {
    clients,
    galleryCollection,
    type GalleryRecord,
    type GalleryStatus
} from '../../../data/crm';
import { getDropboxClient, type DropboxClient } from '../../../server/dropbox/client';
import type { DropboxFileMetadata } from '../../../types/dropbox';

type GallerySummary = {
    id: string;
    clientId: string | null;
    clientName: string | null;
    clientEmail: string | null;
    shootType: string;
    status: GalleryStatus;
    deliveryDueDate: string | null;
    deliveredAt: string | null;
    dropboxFolderPath: string | null;
    assetCount: number;
    previewUrls: string[];
    error?: string | null;
};

type GalleryImage = {
    id: string;
    name: string;
    pathDisplay: string | null;
    size: number | null;
    clientModified: string | null;
    previewUrl: string | null;
};

type GalleriesListResponse = {
    galleries: GallerySummary[];
    totals: {
        galleryCount: number;
        assetCount: number;
        connectedClients: number;
    };
};

type GalleryDetailResponse = {
    gallery: GallerySummary;
    images: GalleryImage[];
};

type ErrorResponse = {
    error: string;
};

type GalleriesResponse = GalleriesListResponse | GalleryDetailResponse | ErrorResponse;

const IMAGE_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.tif',
    '.tiff',
    '.webp',
    '.heic',
    '.heif'
]);

function getSingleQueryParam(value: string | string[] | undefined): string | null {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'string') {
            const trimmed = first.trim();
            return trimmed.length > 0 ? trimmed : null;
        }
    }

    return null;
}

function ensureLeadingSlash(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
}

function resolveDropboxFolderPath(gallery: GalleryRecord): string | null {
    const fromExplicitPath = typeof gallery.dropboxFolderPath === 'string' ? gallery.dropboxFolderPath.trim() : '';
    if (fromExplicitPath) {
        return ensureLeadingSlash(fromExplicitPath);
    }

    const fromCustomField = gallery.customFields?.dropboxFolder;
    if (typeof fromCustomField === 'string' && fromCustomField.trim().length > 0) {
        return ensureLeadingSlash(fromCustomField.trim());
    }

    if (Array.isArray(gallery.dropboxFiles)) {
        for (const entry of gallery.dropboxFiles) {
            if (typeof entry !== 'string') {
                continue;
            }

            const trimmed = entry.trim();
            if (!trimmed) {
                continue;
            }

            if (!trimmed.includes('/')) {
                return ensureLeadingSlash(trimmed);
            }

            const folder = trimmed.slice(0, trimmed.lastIndexOf('/'));
            if (folder) {
                return ensureLeadingSlash(folder);
            }
        }
    }

    return null;
}

function createSummaryBase(gallery: GalleryRecord, folderPath: string | null): GallerySummary {
    const clientRecord = clients.find((client) => client.name === gallery.client);

    return {
        id: gallery.id,
        clientId: clientRecord?.id ?? null,
        clientName: clientRecord?.name ?? gallery.client ?? null,
        clientEmail: clientRecord?.email ?? null,
        shootType: gallery.shootType,
        status: gallery.status,
        deliveryDueDate: gallery.deliveryDueDate ?? null,
        deliveredAt: gallery.deliveredAt ?? null,
        dropboxFolderPath: folderPath,
        assetCount: 0,
        previewUrls: []
    } satisfies GallerySummary;
}

function getFileExtension(name: string): string {
    const index = name.lastIndexOf('.');
    return index >= 0 ? name.slice(index).toLowerCase() : '';
}

function filterImageEntries(entries: DropboxFileMetadata[]): DropboxFileMetadata[] {
    return entries.filter((entry) => {
        if (!entry || typeof entry.name !== 'string') {
            return false;
        }

        const extension = getFileExtension(entry.name);
        return IMAGE_EXTENSIONS.has(extension);
    });
}

function resolveDropboxSelector(entry: DropboxFileMetadata): string | null {
    if (entry.pathLower) {
        return entry.pathLower;
    }

    if (entry.pathDisplay) {
        return entry.pathDisplay;
    }

    return entry.id ?? null;
}

async function buildPreviewUrls(
    dropbox: DropboxClient,
    entries: DropboxFileMetadata[],
    limit: number
): Promise<string[]> {
    if (entries.length === 0 || limit <= 0) {
        return [];
    }

    const subset = entries.slice(0, limit);
    const results = await Promise.all(
        subset.map(async (entry) => {
            const selector = resolveDropboxSelector(entry);
            if (!selector) {
                return null;
            }

            try {
                return await dropbox.getTemporaryLink({ path: selector });
            } catch (error) {
                console.error('Failed to create Dropbox preview link', error);
                return null;
            }
        })
    );

    return results.filter((link): link is string => typeof link === 'string' && link.length > 0);
}

async function buildGalleryImagesFromDropbox(
    dropbox: DropboxClient,
    entries: DropboxFileMetadata[]
): Promise<GalleryImage[]> {
    if (entries.length === 0) {
        return [];
    }

    return Promise.all(
        entries.map(async (entry) => {
            const selector = resolveDropboxSelector(entry);
            let previewUrl: string | null = null;

            if (selector) {
                try {
                    previewUrl = await dropbox.getTemporaryLink({ path: selector });
                } catch (error) {
                    console.error('Failed to fetch Dropbox preview link', error);
                }
            }

            return {
                id: entry.id,
                name: entry.name,
                pathDisplay: entry.pathDisplay ?? entry.pathLower ?? null,
                size: typeof entry.size === 'number' ? entry.size : null,
                clientModified: entry.clientModified ?? entry.serverModified ?? null,
                previewUrl
            } satisfies GalleryImage;
        })
    );
}

function buildFallbackImages(gallery: GalleryRecord): GalleryImage[] {
    if (!Array.isArray(gallery.assets) || gallery.assets.length === 0) {
        return [];
    }

    return gallery.assets.map((asset) => ({
        id: asset.id,
        name: asset.fileName,
        pathDisplay: asset.storagePath ?? null,
        size: typeof asset.size === 'number' ? asset.size : null,
        clientModified: asset.uploadedAt ?? null,
        previewUrl: asset.publicUrl ?? null
    } satisfies GalleryImage));
}

function collectPreviewUrls(images: GalleryImage[], limit: number): string[] {
    if (images.length === 0 || limit <= 0) {
        return [];
    }

    return images
        .filter((image) => typeof image.previewUrl === 'string' && image.previewUrl.length > 0)
        .slice(0, limit)
        .map((image) => image.previewUrl as string);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<GalleriesResponse>) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    const requestedGalleryId = getSingleQueryParam(req.query.galleryId);

    let dropbox: DropboxClient | null = null;

    try {
        dropbox = getDropboxClient();
    } catch (error) {
        console.error('Dropbox client initialization failed', error);
    }

    if (requestedGalleryId) {
        const gallery = galleryCollection.find((entry) => entry.id === requestedGalleryId);

        if (!gallery) {
            res.status(404).json({ error: 'Gallery not found.' });
            return;
        }

        const folderPath = resolveDropboxFolderPath(gallery);
        const baseSummary = createSummaryBase(gallery, folderPath);

        if (!dropbox) {
            const fallbackImages = buildFallbackImages(gallery);
            res.status(200).json({
                gallery: {
                    ...baseSummary,
                    assetCount: fallbackImages.length,
                    previewUrls: collectPreviewUrls(fallbackImages, 4),
                    error: 'Dropbox integration is not configured. Displaying synced library assets instead.'
                },
                images: fallbackImages
            });
            return;
        }

        if (!folderPath) {
            const fallbackImages = buildFallbackImages(gallery);
            res.status(200).json({
                gallery: {
                    ...baseSummary,
                    assetCount: fallbackImages.length,
                    previewUrls: collectPreviewUrls(fallbackImages, 4),
                    error: 'Dropbox folder is not configured for this gallery.'
                },
                images: fallbackImages
            });
            return;
        }

        try {
            const dropboxEntries = await dropbox.listFolder(folderPath);
            const imageEntries = filterImageEntries(dropboxEntries);
            const images = await buildGalleryImagesFromDropbox(dropbox, imageEntries);

            res.status(200).json({
                gallery: {
                    ...baseSummary,
                    assetCount: images.length,
                    previewUrls: collectPreviewUrls(images, 4)
                },
                images
            });
            return;
        } catch (error) {
            console.error(`Failed to load Dropbox assets for gallery ${gallery.id}`, error);
            const fallbackImages = buildFallbackImages(gallery);

            res.status(200).json({
                gallery: {
                    ...baseSummary,
                    assetCount: fallbackImages.length,
                    previewUrls: collectPreviewUrls(fallbackImages, 4),
                    error: 'Unable to load Dropbox assets. Displaying synced library assets instead.'
                },
                images: fallbackImages
            });
            return;
        }
    }

    const summaries = await Promise.all(
        galleryCollection.map(async (gallery) => {
            const folderPath = resolveDropboxFolderPath(gallery);
            const baseSummary = createSummaryBase(gallery, folderPath);

            if (!dropbox) {
                const fallbackImages = buildFallbackImages(gallery);
                return {
                    ...baseSummary,
                    assetCount: fallbackImages.length,
                    previewUrls: collectPreviewUrls(fallbackImages, 4),
                    error: 'Dropbox integration is not configured. Configure credentials to sync live assets.'
                } satisfies GallerySummary;
            }

            if (!folderPath) {
                const fallbackImages = buildFallbackImages(gallery);
                return {
                    ...baseSummary,
                    assetCount: fallbackImages.length,
                    previewUrls: collectPreviewUrls(fallbackImages, 4),
                    error: 'Dropbox folder is not configured for this gallery.'
                } satisfies GallerySummary;
            }

            try {
                const dropboxEntries = await dropbox.listFolder(folderPath);
                const imageEntries = filterImageEntries(dropboxEntries);
                const previewUrls = await buildPreviewUrls(dropbox, imageEntries, 4);

                return {
                    ...baseSummary,
                    assetCount: imageEntries.length,
                    previewUrls
                } satisfies GallerySummary;
            } catch (error) {
                console.error(`Failed to summarize Dropbox assets for gallery ${gallery.id}`, error);
                const fallbackImages = buildFallbackImages(gallery);

                return {
                    ...baseSummary,
                    assetCount: fallbackImages.length,
                    previewUrls: collectPreviewUrls(fallbackImages, 4),
                    error: 'Unable to access Dropbox folder. Displaying synced library assets instead.'
                } satisfies GallerySummary;
            }
        })
    );

    const connectedClients = new Set<string>();
    for (const summary of summaries) {
        if (summary.clientId) {
            connectedClients.add(`id:${summary.clientId}`);
        } else if (summary.clientName) {
            connectedClients.add(`name:${summary.clientName}`);
        }
    }

    const totals = {
        galleryCount: summaries.length,
        assetCount: summaries.reduce((sum, summary) => sum + summary.assetCount, 0),
        connectedClients: connectedClients.size
    } satisfies GalleriesListResponse['totals'];

    res.status(200).json({ galleries: summaries, totals });
}
