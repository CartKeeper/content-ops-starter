import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { type Fields, type Files, type File as FormidableFile } from 'formidable';
import fs from 'fs/promises';

import { getSupabaseClient } from '../../../../utils/supabase-client';
import { storeGalleryAsset } from '../../../../server/galleries/storage';

export const config = {
    api: {
        bodyParser: false
    }
};

type UploadResponse = {
    data?: unknown;
    error?: string;
};

const formParser = formidable({ multiples: false, keepExtensions: true });

function parseField(value: Fields[keyof Fields] | undefined): string | undefined {
    if (Array.isArray(value)) {
        return parseField(value[0]);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
    }

    return undefined;
}

function collectFiles(files: Files): FormidableFile[] {
    const result: FormidableFile[] = [];

    Object.values(files).forEach((entry) => {
        if (!entry) {
            return;
        }

        if (Array.isArray(entry)) {
            entry.forEach((file) => {
                if (file) {
                    result.push(file as FormidableFile);
                }
            });
        } else {
            result.push(entry as FormidableFile);
        }
    });

    return result;
}

async function parseRequest(
    req: NextApiRequest
): Promise<{ fields: Fields; files: FormidableFile[] }> {
    return new Promise((resolve, reject) => {
        formParser.parse(req, (error, fields, files) => {
            if (error) {
                reject(error);
                return;
            }

            resolve({ fields, files: collectFiles(files) });
        });
    });
}

export default async function uploadGalleryAsset(
    req: NextApiRequest,
    res: NextApiResponse<UploadResponse>
): Promise<void> {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    try {
        const { fields, files } = await parseRequest(req);

        if (files.length === 0) {
            res.status(400).json({ error: 'No files were uploaded.' });
            return;
        }

        const supabase = getSupabaseClient();
        const file = files[0];
        const buffer = await fs.readFile(file.filepath);

        const clientId = parseField(fields.clientId) ?? parseField(fields.client);
        const projectCode = parseField(fields.projectCode) ?? parseField(fields.project);
        const dropboxFileId = parseField(fields.dropboxFileId);
        const dropboxRevision = parseField(fields.dropboxRevision);

        const { asset, duplicate } = await storeGalleryAsset({
            supabase,
            buffer,
            fileName: file.originalFilename || file.newFilename || 'upload',
            contentType: file.mimetype || 'application/octet-stream',
            size: typeof file.size === 'number' ? file.size : undefined,
            clientId: clientId ?? null,
            projectCode: projectCode ?? null,
            dropboxFileId: dropboxFileId ?? null,
            dropboxRevision: dropboxRevision ?? null,
            source: 'uploader'
        });

        await fs.unlink(file.filepath).catch(() => undefined);

        res.status(duplicate ? 200 : 201).json({ data: asset });
    } catch (error) {
        console.error('Gallery upload failed', error);
        const message = error instanceof Error ? error.message : 'Unable to process upload.';
        res.status(500).json({ error: message });
    }
}
