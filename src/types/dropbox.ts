export type AssetSyncStatus = 'Synced' | 'Syncing' | 'Pending' | 'Error' | 'Archived';

export type DropboxAssetRecord = {
    id: string;
    fileName: string;
    dropboxPath: string;
    folderPath: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    sizeInBytes: number;
    mimeType?: string;
    checksum?: string;
    syncedAt?: string;
    width?: number;
    height?: number;
    status: AssetSyncStatus;
    tags: string[];
    clientId?: string | null;
    clientName?: string | null;
    projectId?: string | null;
    projectName?: string | null;
    galleryId?: string | null;
    galleryName?: string | null;
};

export type DropboxFileMetadata = {
    id: string;
    name: string;
    pathDisplay: string | null;
    pathLower: string | null;
    clientModified: string | null;
    serverModified: string | null;
    size: number | null;
    isDownloadable: boolean;
    contentHash: string | null;
};
