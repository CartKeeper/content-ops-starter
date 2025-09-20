import type { NextApiRequest, NextApiResponse } from 'next';

import { getDropboxClient } from '../../../server/dropbox/client';
import type { DropboxFileMetadata } from '../../../types/dropbox';

type ListFolderResponse = {
    data?: { entries: DropboxFileMetadata[] };
    error?: string;
};

const ALLOWED_METHODS = ['POST'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListFolderResponse>) {
    if (!ALLOWED_METHODS.includes(req.method as (typeof ALLOWED_METHODS)[number])) {
        res.setHeader('Allow', ALLOWED_METHODS);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const rawPath = typeof body?.path === 'string' ? body.path : '';
        const trimmedPath = rawPath.trim();
        const path = trimmedPath === '/' ? '' : trimmedPath;

        const client = getDropboxClient();
        const entries = await client.listFolder(path);

        res.status(200).json({ data: { entries } });
    } catch (error) {
        console.error('Dropbox list-folder error', error);

        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
            return;
        }

        res.status(500).json({ error: 'Unable to list Dropbox folder.' });
    }
}
