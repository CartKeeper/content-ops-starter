import { Buffer } from 'node:buffer';

import type { DropboxFileMetadata } from '../../types/dropbox';

const DROPBOX_API_BASE_URL = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_BASE_URL = 'https://content.dropboxapi.com/2';

const TOKEN_REFRESH_BUFFER_MS = 60_000; // refresh tokens one minute before expiry

type DropboxOAuthConfig = {
    appKey: string;
    appSecret: string;
    refreshToken: string;
};

type DropboxAccessTokenCache = {
    accessToken: string;
    expiresAt: number;
};

type DropboxListFolderEntry = {
    '.tag': 'file' | 'folder' | 'deleted';
    id: string;
    name: string;
    path_display?: string;
    path_lower?: string;
    client_modified?: string;
    server_modified?: string;
    size?: number;
    is_downloadable?: boolean;
    content_hash?: string;
};

type DropboxListFolderResponse = {
    entries: DropboxListFolderEntry[];
    cursor?: string;
    has_more?: boolean;
};

type DropboxDownloadResult = {
    metadata: DropboxFileMetadata | null;
    file: Buffer;
    contentType: string | null;
};

export type DropboxClient = {
    listFolder: (path: string) => Promise<DropboxFileMetadata[]>;
    downloadFile: (input: { path?: string; id?: string }) => Promise<DropboxDownloadResult>;
    getTemporaryLink: (input: { path?: string; id?: string }) => Promise<string>;
};

let cachedToken: DropboxAccessTokenCache | null = null;
let inflightTokenRequest: Promise<string> | null = null;

function getOAuthConfig(): DropboxOAuthConfig {
    const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
    const appSecret = process.env.DROPBOX_APP_SECRET;
    const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;

    if (!appKey || !appSecret || !refreshToken) {
        throw new Error('Dropbox OAuth environment variables are not configured.');
    }

    return { appKey, appSecret, refreshToken };
}

async function fetchAccessToken(): Promise<string> {
    const now = Date.now();

    if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS > now) {
        return cachedToken.accessToken;
    }

    if (inflightTokenRequest) {
        return inflightTokenRequest;
    }

    inflightTokenRequest = (async () => {
        const { appKey, appSecret, refreshToken } = getOAuthConfig();
        const payload = new URLSearchParams();
        payload.set('grant_type', 'refresh_token');
        payload.set('refresh_token', refreshToken);

        const basicAuth = Buffer.from(`${appKey}:${appSecret}`).toString('base64');

        const response = await fetch(`${DROPBOX_API_BASE_URL}/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: payload.toString()
        });

        if (!response.ok) {
            inflightTokenRequest = null;
            throw new Error(`Dropbox OAuth token exchange failed: ${response.statusText}`);
        }

        const data = (await response.json()) as { access_token?: string; expires_in?: number };
        const accessToken = data.access_token;
        const expiresIn = typeof data.expires_in === 'number' ? data.expires_in * 1000 : 0;

        if (!accessToken) {
            inflightTokenRequest = null;
            throw new Error('Dropbox OAuth response missing access_token.');
        }

        cachedToken = {
            accessToken,
            expiresAt: Date.now() + (expiresIn || 5 * 60 * 1000)
        } satisfies DropboxAccessTokenCache;

        inflightTokenRequest = null;
        return accessToken;
    })();

    try {
        return await inflightTokenRequest;
    } finally {
        inflightTokenRequest = null;
    }
}

function mapEntry(entry: DropboxListFolderEntry): DropboxFileMetadata | null {
    if (entry['.tag'] !== 'file') {
        return null;
    }

    return {
        id: entry.id,
        name: entry.name,
        pathDisplay: entry.path_display ?? null,
        pathLower: entry.path_lower ?? null,
        clientModified: entry.client_modified ?? null,
        serverModified: entry.server_modified ?? null,
        size: typeof entry.size === 'number' ? entry.size : null,
        isDownloadable: entry.is_downloadable !== false,
        contentHash: entry.content_hash ?? null
    } satisfies DropboxFileMetadata;
}

async function listFolder(path: string): Promise<DropboxFileMetadata[]> {
    const token = await fetchAccessToken();
    const entries: DropboxFileMetadata[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
        const endpoint = cursor ? `${DROPBOX_API_BASE_URL}/files/list_folder/continue` : `${DROPBOX_API_BASE_URL}/files/list_folder`;
        const body = cursor ? { cursor } : { path, recursive: false, include_media_info: false, include_deleted: false, include_non_downloadable_files: true };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Dropbox list_folder failed with status ${response.status}`);
        }

        const data = (await response.json()) as DropboxListFolderResponse;
        const mappedEntries = (data.entries ?? []).map(mapEntry).filter((entry): entry is DropboxFileMetadata => Boolean(entry));
        entries.push(...mappedEntries);

        cursor = data.cursor;
        hasMore = Boolean(data.has_more && cursor);
    }

    return entries;
}

async function downloadFile(input: { path?: string; id?: string }): Promise<DropboxDownloadResult> {
    const token = await fetchAccessToken();
    const selector = input.id || input.path;

    if (!selector) {
        throw new Error('Dropbox downloadFile requires either a file id or path.');
    }

    const response = await fetch(`${DROPBOX_CONTENT_BASE_URL}/files/download`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({ path: selector })
        }
    });

    if (!response.ok) {
        throw new Error(`Dropbox file download failed with status ${response.status}`);
    }

    const metadataHeader = response.headers.get('dropbox-api-result');
    let metadata: DropboxFileMetadata | null = null;

    if (metadataHeader) {
        try {
            const parsed = JSON.parse(metadataHeader) as DropboxListFolderEntry;
            const mapped = mapEntry(parsed);
            metadata = mapped ?? {
                id: parsed.id,
                name: parsed.name,
                pathDisplay: parsed.path_display ?? null,
                pathLower: parsed.path_lower ?? null,
                clientModified: parsed.client_modified ?? null,
                serverModified: parsed.server_modified ?? null,
                size: typeof parsed.size === 'number' ? parsed.size : null,
                isDownloadable: parsed.is_downloadable !== false,
                contentHash: parsed.content_hash ?? null
            } satisfies DropboxFileMetadata;
        } catch (error) {
            // Ignore metadata parsing errors and fall back to null.
        }
    }

    const arrayBuffer = await response.arrayBuffer();

    return {
        metadata,
        file: Buffer.from(arrayBuffer),
        contentType: response.headers.get('Content-Type')
    } satisfies DropboxDownloadResult;
}

type DropboxTemporaryLinkResponse = {
    link?: string;
};

async function getTemporaryLink(input: { path?: string; id?: string }): Promise<string> {
    const token = await fetchAccessToken();
    const selector = input.id || input.path;

    if (!selector) {
        throw new Error('Dropbox getTemporaryLink requires either a file id or path.');
    }

    const response = await fetch(`${DROPBOX_API_BASE_URL}/files/get_temporary_link`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: selector })
    });

    if (!response.ok) {
        throw new Error(`Dropbox get_temporary_link failed with status ${response.status}`);
    }

    const data = (await response.json()) as DropboxTemporaryLinkResponse;

    if (!data.link) {
        throw new Error('Dropbox get_temporary_link response did not include a link.');
    }

    return data.link;
}

export function getDropboxClient(): DropboxClient {
    return {
        listFolder,
        downloadFile,
        getTemporaryLink
    } satisfies DropboxClient;
}
