import type { NextApiRequest, NextApiResponse } from 'next';

import { storeGalleryAsset } from '../../../../server/galleries/storage';
import { getSupabaseClient } from '../../../../utils/supabase-client';

type DropboxWebhookFile = {
    id?: string;
    name?: string;
    downloadUrl?: string;
    size?: number;
    contentType?: string;
    rev?: string;
    revision?: string;
    clientId?: string;
    projectCode?: string;
};

type DropboxWebhookPayload = {
    clientId?: string;
    projectCode?: string;
    files?: DropboxWebhookFile[];
    secret?: string;
};

type DropboxWebhookResult = {
    id: string;
    status: 'stored' | 'duplicate' | 'error';
    duplicate?: boolean;
    error?: string;
    asset?: unknown;
};

type DropboxWebhookResponse = {
    data?: DropboxWebhookResult[];
    error?: string;
};

function parseJsonBody(req: NextApiRequest): DropboxWebhookPayload | null {
    if (!req.body) {
        return null;
    }

    if (typeof req.body === 'string') {
        try {
            const parsed = JSON.parse(req.body);
            return parsed ?? null;
        } catch (error) {
            return null;
        }
    }

    return req.body as DropboxWebhookPayload;
}

function validateSecret(req: NextApiRequest, payload: DropboxWebhookPayload): boolean {
    const configuredSecret = process.env.DROPBOX_WEBHOOK_SECRET;
    if (!configuredSecret) {
        return true;
    }

    const headerSecret = req.headers['x-webhook-secret'];
    const candidate = typeof headerSecret === 'string' ? headerSecret : Array.isArray(headerSecret) ? headerSecret[0] : null;
    const bodySecret = typeof payload.secret === 'string' ? payload.secret : null;

    return configuredSecret === candidate || configuredSecret === bodySecret;
}

async function downloadFile(file: DropboxWebhookFile): Promise<{ buffer: Buffer; contentType: string }> {
    if (!file.downloadUrl) {
        throw new Error('Dropbox file is missing downloadUrl.');
    }

    const response = await fetch(file.downloadUrl);

    if (!response.ok) {
        throw new Error(`Failed to download file (${response.status}).`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.contentType || response.headers.get('content-type') || 'application/octet-stream';

    return { buffer, contentType };
}

export default async function dropboxWebhookHandler(
    req: NextApiRequest,
    res: NextApiResponse<DropboxWebhookResponse>
): Promise<void> {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    const payload = parseJsonBody(req);

    if (!payload) {
        res.status(400).json({ error: 'Invalid webhook payload.' });
        return;
    }

    if (!validateSecret(req, payload)) {
        res.status(401).json({ error: 'Webhook secret mismatch.' });
        return;
    }

    const files = Array.isArray(payload.files) ? payload.files : [];

    if (files.length === 0) {
        res.status(202).json({ data: [] });
        return;
    }

    const supabase = getSupabaseClient();
    const results: DropboxWebhookResult[] = [];

    for (const [index, file] of files.entries()) {
        const identifier = file.id || file.name || `file-${index + 1}`;

        try {
            const { buffer, contentType } = await downloadFile(file);
            const clientId = file.clientId || payload.clientId || null;
            const projectCode = file.projectCode || payload.projectCode || null;
            const { asset, duplicate } = await storeGalleryAsset({
                supabase,
                buffer,
                fileName: file.name || identifier,
                contentType,
                size: file.size ?? buffer.byteLength,
                clientId,
                projectCode,
                dropboxFileId: file.id ?? null,
                dropboxRevision: file.rev ?? file.revision ?? null,
                source: 'dropbox-webhook'
            });

            results.push({
                id: identifier,
                status: duplicate ? 'duplicate' : 'stored',
                duplicate,
                asset
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            results.push({ id: identifier, status: 'error', error: message });
        }
    }

    res.status(202).json({ data: results });
}
