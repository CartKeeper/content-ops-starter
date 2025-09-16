import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

type ResourceKey = 'bookings' | 'invoices' | 'galleries';

type ResourceConfig = {
    file: string;
    type: string;
};

const RESOURCE_CONFIG: Record<ResourceKey, ResourceConfig> = {
    bookings: { file: 'crm-bookings.json', type: 'CrmBookings' },
    invoices: { file: 'crm-invoices.json', type: 'CrmInvoices' },
    galleries: { file: 'crm-galleries.json', type: 'CrmGalleries' }
};

const DATA_DIRECTORY = path.join(process.cwd(), 'content', 'data');

async function readRecords<T>(config: ResourceConfig): Promise<T[]> {
    const filePath = path.join(DATA_DIRECTORY, config.file);

    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as { items?: T[] } | T[];

        if (Array.isArray(parsed)) {
            return parsed as T[];
        }

        if (parsed && Array.isArray(parsed.items)) {
            return parsed.items as T[];
        }
    } catch (error) {
        // If the file doesn't exist yet we'll create it on write
    }

    return [];
}

async function writeRecords<T>(config: ResourceConfig, records: T[]): Promise<void> {
    const filePath = path.join(DATA_DIRECTORY, config.file);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const payload = JSON.stringify({ type: config.type, items: records }, null, 4);
    await fs.writeFile(filePath, `${payload}\n`, 'utf-8');
}

function parseResourceKey(value: string | string[] | undefined): ResourceKey | null {
    if (!value) {
        return null;
    }

    const key = Array.isArray(value) ? value[0] : value;

    if (key === 'bookings' || key === 'invoices' || key === 'galleries') {
        return key;
    }

    return null;
}

function ensureRecordId(resource: ResourceKey, records: Array<{ id?: unknown }>, payload: Record<string, unknown>) {
    if (typeof payload.id === 'string' && payload.id.trim() !== '') {
        return payload;
    }

    const result: Record<string, unknown> = { ...payload };

    if (resource === 'invoices') {
        const numericIds = records
            .map((record) => {
                const idValue = record.id;
                if (typeof idValue === 'string') {
                    const parsed = Number.parseInt(idValue, 10);
                    return Number.isFinite(parsed) ? parsed : null;
                }
                if (typeof idValue === 'number' && Number.isFinite(idValue)) {
                    return idValue;
                }
                return null;
            })
            .filter((value): value is number => value !== null);

        const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1000;
        result.id = String(nextId);
        return result;
    }

    const prefix = resource === 'bookings' ? 'bk' : 'gal';
    result.id = `${prefix}-${randomUUID().slice(0, 8)}`;
    return result;
}

function parsePayload(body: NextApiRequest['body']): Record<string, unknown> | null {
    if (!body) {
        return null;
    }

    if (typeof body === 'object') {
        return body as Record<string, unknown>;
    }

    if (typeof body === 'string') {
        try {
            const parsed = JSON.parse(body);
            return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
        } catch (error) {
            return null;
        }
    }

    return null;
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, config: ResourceConfig) {
    const records = await readRecords(config);
    return res.status(200).json({ data: records });
}

async function handlePost(
    req: NextApiRequest,
    res: NextApiResponse,
    resourceKey: ResourceKey,
    config: ResourceConfig
) {
    const payload = parsePayload(req.body);

    if (!payload) {
        return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }

    const records = await readRecords<Record<string, unknown>>(config);
    const recordWithId = ensureRecordId(resourceKey, records, payload);
    records.push(recordWithId);
    await writeRecords(config, records);

    return res.status(201).json({ data: recordWithId });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const resourceKey = parseResourceKey(req.query.resource);

    if (!resourceKey) {
        return res.status(404).json({ error: 'Unknown CRM resource.' });
    }

    const config = RESOURCE_CONFIG[resourceKey];

    try {
        switch (req.method) {
            case 'GET':
                return await handleGet(req, res, config);
            case 'POST':
                return await handlePost(req, res, resourceKey, config);
            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return res.status(405).json({ error: `Method ${req.method} not allowed.` });
        }
    } catch (error) {
        console.error('CRM resource handler error', error);
        return res.status(500).json({ error: 'Unexpected server error.' });
    }
}

