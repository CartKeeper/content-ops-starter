import type { DropboxChooserFile } from '../types/dropbox-chooser';

export type DropboxImportAsset = {
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

function normalizeChooserFile(file: DropboxChooserFile): DropboxImportAsset {
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

function isFolderSelection(file: DropboxChooserFile | null | undefined): boolean {
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

function normalizeListFolderFile(entry: DropboxListFolderEntry): DropboxImportAsset {
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

export async function collectAssetsFromSelection({
    selection,
    accessToken
}: {
    selection: DropboxChooserFile[];
    accessToken?: string | null;
}): Promise<DropboxImportAsset[]> {
    const assetsByKey = new Map<string, DropboxImportAsset>();

    for (const file of selection) {
        if (!file) {
            continue;
        }

        if (isFolderSelection(file)) {
            if (!accessToken) {
                throw new Error('Dropbox folder selection requires an access token.');
            }
            const options = buildFolderRequestOptions(file);

            if (options.length === 0) {
                console.warn('Dropbox folder selection missing path information', file);
                continue;
            }

            let folderEntries: DropboxListFolderEntry[] | null = null;
            let lastError: unknown = null;

            for (const option of options) {
                try {
                    folderEntries = await listDropboxFolderFiles({
                        accessToken,
                        path: option.path,
                        sharedLinkUrl: option.sharedLinkUrl
                    });
                    break;
                } catch (error) {
                    lastError = error;
                }
            }

            if (!folderEntries) {
                throw lastError instanceof Error
                    ? lastError
                    : new Error('Unable to list Dropbox folder contents.');
            }

            for (const entry of folderEntries) {
                const asset = normalizeListFolderFile(entry);
                const key = asset.dropboxFileId || asset.dropboxPath;
                if (key) {
                    assetsByKey.set(key, asset);
                }
            }
        } else {
            const asset = normalizeChooserFile(file);
            const key = asset.dropboxFileId || asset.dropboxPath;
            if (key) {
                assetsByKey.set(key, asset);
            }
        }
    }

    return Array.from(assetsByKey.values());
}
